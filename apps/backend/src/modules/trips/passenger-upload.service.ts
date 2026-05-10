import { eq } from 'drizzle-orm';
import { parse as csvParse } from 'csv-parse/sync';
import pdfParse from 'pdf-parse';
import * as Tesseract from 'tesseract.js';
import * as XLSX from 'xlsx';
import { db } from '../../db';
import { stops, tripPassengers, trips } from '../../db/schema';
import { ConfirmPassengersRequest } from '../../lib/shared-types';

type ExtractedPassengerRow = {
  name: string | null;
  phone: string | null;
  stop_name: string | null;
  pickup_point: string | null;
  seat_no: string | null;
};

const E164_RE = /^\+91\d{10}$/;

function normalizeRows(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => ({
    name: cleanText(row.name ?? row.Name),
    phone: cleanPhone(row.phone ?? row.Phone),
    stop_name: cleanText(row.stop_name ?? row['Stop Name'] ?? row.stop ?? row.Stop),
    pickup_point: cleanText(row.pickup_point ?? row['Pickup Point']),
    seat_no: cleanText(row.seat_no ?? row['Seat No'] ?? row.seat ?? row.Seat),
  }));
}

function cleanText(value: unknown) {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function cleanPhone(value: unknown) {
  const text = cleanText(value);
  if (!text) return null;
  const digits = text.replace(/[^\d+]/g, '');
  if (/^\d{10}$/.test(digits)) return `+91${digits}`;
  if (/^\+91\d{10}$/.test(digits)) return digits;
  return text;
}

function parseSpreadsheet(buffer: Buffer, mimetype: string, filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'csv' || mimetype === 'text/csv') {
    return normalizeRows(
      csvParse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as Array<Record<string, unknown>>
    );
  }

  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  return normalizeRows(rows);
}

async function extractPdfText(buffer: Buffer) {
  const result = await pdfParse(buffer);
  return result.text;
}

async function extractImageText(buffer: Buffer) {
  const result = await Tesseract.recognize(buffer, 'eng');
  return result.data.text;
}

async function callStructuredModel(text: string, imageBase64?: string) {
  const provider = (process.env.AI_UPLOAD_PROVIDER ?? 'openrouter').trim().toLowerCase();
  const prompt =
    'Extract passenger list from this content. Return only valid JSON array. Each item must include name, phone, stop_name, pickup_point, seat_no. Phone must be E.164 (+91XXXXXXXXXX). If missing, return null.';

  if (provider === 'nvidia') {
    const apiKey = process.env.NVIDIA_API_KEY?.trim();
    const model = process.env.NVIDIA_MODEL?.trim() || 'meta/llama-3.3-70b-instruct';
    if (!apiKey) throw Object.assign(new Error('NVIDIA_API_KEY is not configured'), { statusCode: 500 });

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [
          {
            role: 'user',
            content: imageBase64
              ? [
                  { type: 'text', text: `${prompt}\n\nOCR/Text:\n${text}` },
                  { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } },
                ]
              : `${prompt}\n\n${text}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw Object.assign(new Error('NVIDIA extraction request failed'), { statusCode: 502 });
    }

    const payload = await response.json() as any;
    return payload.choices?.[0]?.message?.content ?? '[]';
  }

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const model = process.env.OPENROUTER_MODEL?.trim() || 'openai/gpt-4.1-mini';
  if (!apiKey) throw Object.assign(new Error('OPENROUTER_API_KEY is not configured'), { statusCode: 500 });

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://bus-alert.local',
      'X-Title': 'Bus Alert Passenger Upload',
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: imageBase64
            ? [
                { type: 'text', text: `${prompt}\n\nOCR/Text:\n${text}` },
                { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } },
              ]
            : `${prompt}\n\n${text}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw Object.assign(new Error('OpenRouter extraction request failed'), { statusCode: 502 });
  }

  const payload = await response.json() as any;
  return payload.choices?.[0]?.message?.content ?? '[]';
}

function parseModelJson(content: string): ExtractedPassengerRow[] {
  const jsonBlock = content.match(/\[[\s\S]*\]/)?.[0] ?? content;
  const parsed = JSON.parse(jsonBlock);
  if (!Array.isArray(parsed)) return [];
  return normalizeRows(parsed as Array<Record<string, unknown>>);
}

export async function previewPassengerUpload(fileBuffer: Buffer, mimetype: string, filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';

  if (['csv', 'xlsx', 'xls'].includes(ext) || mimetype === 'text/csv') {
    return { raw_passengers: parseSpreadsheet(fileBuffer, mimetype, filename) };
  }

  if (ext === 'pdf') {
    const text = await extractPdfText(fileBuffer);
    return { raw_passengers: parseModelJson(await callStructuredModel(text)) };
  }

  if (['jpg', 'jpeg', 'png'].includes(ext)) {
    const imageBase64 = fileBuffer.toString('base64');
    const ocrText = await extractImageText(fileBuffer);
    return { raw_passengers: parseModelJson(await callStructuredModel(ocrText, imageBase64)) };
  }

  throw Object.assign(new Error('Unsupported file type. Use xlsx, csv, pdf, jpg, jpeg, or png.'), {
    statusCode: 400,
    code: 'UNSUPPORTED_FILE_TYPE',
  });
}

export async function confirmPassengerUpload(tripId: string, payload: ConfirmPassengersRequest) {
  const [trip] = await db
    .select({ id: trips.id, route_id: trips.route_id })
    .from(trips)
    .where(eq(trips.id, tripId))
    .limit(1);

  if (!trip) {
    throw Object.assign(new Error('Trip not found'), { statusCode: 404 });
  }

  const routeStops = await db
    .select({ id: stops.id, name: stops.name })
    .from(stops)
    .where(eq(stops.route_id, trip.route_id));

  const stopMap = new Map(routeStops.map((stop) => [stop.name.trim().toLowerCase(), stop.id]));

  const rowErrors = payload.passengers.flatMap((row: ConfirmPassengersRequest['passengers'][number], index: number) => {
    const errors: string[] = [];
    if (!E164_RE.test(row.phone)) {
      errors.push('Invalid phone format');
    }
    const stopId = stopMap.get(row.stop_name.trim().toLowerCase());
    if (!stopId) {
      errors.push('Stop not found');
    }
    return errors.length > 0
      ? [{ row: index + 1, data: row, errors }]
      : [];
  });

  if (rowErrors.length > 0) {
    throw Object.assign(new Error('Passenger confirmation failed validation'), {
      statusCode: 400,
      code: 'PASSENGER_CONFIRMATION_INVALID',
      rowErrors,
    });
  }

  const existingPhones = new Set(
    (
      await db
        .select({ phone: tripPassengers.passenger_phone })
        .from(tripPassengers)
        .where(eq(tripPassengers.trip_id, tripId))
    ).map((row) => row.phone)
  );

  const duplicatePhone = payload.passengers.find((row: ConfirmPassengersRequest['passengers'][number]) => existingPhones.has(row.phone));
  if (duplicatePhone) {
    throw Object.assign(new Error(`Passenger ${duplicatePhone.phone} is already registered on this trip`), {
      statusCode: 409,
      code: 'PASSENGER_ALREADY_EXISTS',
    });
  }

  const inserted = await db
    .insert(tripPassengers)
    .values(
      payload.passengers.map((row) => ({
        trip_id: tripId,
        passenger_name: row.name,
        passenger_phone: row.phone,
        stop_id: stopMap.get(row.stop_name.trim().toLowerCase())!,
        pickup_point: row.pickup_point ?? null,
        seat_no: row.seat_no ?? null,
        alert_status: 'pending' as const,
        boarding_status: 'pending' as const,
      }))
    )
    .returning({ id: tripPassengers.id });

  return { saved: inserted.length };
}
