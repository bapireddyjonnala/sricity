import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { globalChat } from '../services/classifier.js';

export default async function globalChatRoute(server: FastifyInstance) {
    server.post('/api/global-chat', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { question, docContext } = request.body as any;
            if (!question) throw new Error("Question is required");

            const answer = await globalChat(question, docContext);
            return reply.send({ answer });
        } catch (error: any) {
            console.error('Global Chat error:', error);
            return reply.status(500).send({ error: 'Failed to generate answer', details: error.message });
        }
    });
}
