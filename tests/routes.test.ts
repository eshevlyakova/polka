import {it,expect} from 'vitest';
import worker from '../apps/bot/src/index';
import type {Env} from '../apps/bot/src/env';
const env={WEBHOOK_SECRET:'secret',BOT_TOKEN:'test',ALLOWED_ORIGIN:'https://example.com'} as Env;
it('rejects forged webhook and unauthorized reminder requests before DB access',async()=>{
 const webhook=await worker.fetch(new Request('https://worker/telegram/webhook',{method:'POST',body:'{}'}),env);expect(webhook.status).toBe(401);
 const api=await worker.fetch(new Request('https://worker/api/reminders',{method:'POST',headers:{Origin:'https://example.com'},body:'{}'}),env);expect(api.status).toBe(401);expect(api.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
 const forbidden=await worker.fetch(new Request('https://worker/api/reminders',{method:'POST',headers:{Origin:'https://evil.example'},body:'{}'}),env);expect(forbidden.status).toBe(403);
});
