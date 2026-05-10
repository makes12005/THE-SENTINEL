import json
with open(r'C:\Users\MAHEK\.gemini\antigravity\brain\a8cfc516-cd74-487a-80c7-50b258fb9e34\.system_generated\logs\overview.txt', 'r', encoding='utf-8') as f:
    for line in f:
        try:
            d = json.loads(line)
            if d.get('source') == 'USER' and d.get('type') == 'USER_MESSAGE':
                last = d['message']['text']
        except:
            pass
print(last)
