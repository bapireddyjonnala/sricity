import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { processDocument } from '../services/classifier.js';
import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';
import { pipeline } from 'stream';
const pump = util.promisify(pipeline);
import * as os from 'os';

export async function classifyRoute(fastify: FastifyInstance) {
  fastify.post('/api/classify', async (req: FastifyRequest, reply: FastifyReply) => {
    const data = await req.file();
    
    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' });
    }

    const tempFilePath = path.join(os.tmpdir(), `upload-${Date.now()}-${data.filename}`);

    try {
      await pump(data.file, fs.createWriteStream(tempFilePath));
      const result = await processDocument(tempFilePath);
      return reply.send(result);
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to process document', details: error.message });
    }
  });
}
