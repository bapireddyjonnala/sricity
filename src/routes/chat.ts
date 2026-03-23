import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { chatWithDocument } from '../services/classifier.js';

interface ChatRequestBody {
  chatId: string;
  question: string;
}

export async function chatRoute(fastify: FastifyInstance) {
  fastify.post('/api/chat', async (req: FastifyRequest<{ Body: ChatRequestBody }>, reply: FastifyReply) => {
    try {
      const { chatId, question } = req.body;
      
      if (!chatId || !question) {
        return reply.code(400).send({ error: 'Missing chatId or question' });
      }

      const answer = await chatWithDocument(chatId, question);
      return reply.send({ answer });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Chat failed', details: error.message });
    }
  });
}
