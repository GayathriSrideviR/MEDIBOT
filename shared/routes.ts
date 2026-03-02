import { z } from 'zod';
import { insertChatSchema, users, chats } from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string() }),
  notFound: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/auth/register' as const,
      input: z.object({ name: z.string(), email: z.string().email(), password: z.string().min(6) }),
      responses: {
        201: z.object({ user: z.custom<typeof users.$inferSelect>(), token: z.string() }),
        400: errorSchemas.validation,
      }
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: z.object({ email: z.string().email(), password: z.string() }),
      responses: {
        200: z.object({ user: z.custom<typeof users.$inferSelect>(), token: z.string() }),
        401: errorSchemas.unauthorized,
      }
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      }
    }
  },
  chats: {
    list: {
      method: 'GET' as const,
      path: '/api/chats' as const,
      responses: {
        200: z.array(z.custom<typeof chats.$inferSelect>()),
        401: errorSchemas.unauthorized,
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/chats' as const,
      input: z.object({ message: z.string() }),
      responses: {
        200: z.object({ 
          reply: z.string(), 
          condition: z.string().optional(),
          severity: z.string().optional(),
          specialist: z.string().optional(),
          hospitalRecommendation: z.object({
            doctorName: z.string(),
            specialization: z.string(),
            hospital: z.string(),
            location: z.string(),
            phone: z.string()
          }).optional().nullable(),
          youtubeRemedy: z.string().optional(),
          arVideo: z.string().optional(),
          firstAidPlan: z.array(z.string()).optional(),
          followUpQuestions: z.array(z.string()).optional()
        }),
        401: errorSchemas.unauthorized,
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
