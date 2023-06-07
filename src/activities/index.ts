import { getContext } from '../core/activity.interceptors';

export async function greet(name: string): Promise<string> {
  const { logger } = getContext();
  logger.info('Log from activity', { name });
  return `Hello, ${name}!`;
}
