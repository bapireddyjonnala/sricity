import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export default async function n8nRoute(server: FastifyInstance) {
    server.post('/api/n8n-trigger', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { reportText, chatId } = request.body as any;
            if (!reportText) throw new Error("Report text is required");

            const webhookUrl = process.env.N8N_WEBHOOK_URL || "https://n8n.example.com/webhook/aurora-ai";
            // If the user hasn't configured it, we can still "mock" success but log a warning.
            
            if (webhookUrl.includes("example.com")) {
                console.log("[N8N AUTOMATION] Triggered with placeholder URL. Provide an actual N8N_WEBHOOK_URL in .env to send real requests.");
                return reply.send({ success: true, message: "Placeholder n8n trigger successful" });
            }

            const n8nResponse = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source: "Aurora.ai",
                    timestamp: new Date().toISOString(),
                    chatId: chatId,
                    fullReport: reportText
                })
            });

            if(!n8nResponse.ok) {
                throw new Error(`n8n responded with status ${n8nResponse.status}`);
            }

            return reply.send({ success: true, message: "Successfully sent to n8n" });
        } catch (error: any) {
            console.error('n8n webhook error:', error);
            // Return 200 so UI doesn't crash, but provide the error internally
            return reply.send({ success: false, error: error.message || 'Internal Server Error' });
        }
    });
}
