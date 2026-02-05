import { prisma } from '@/lib/prisma';

export async function getWebConfig() {
  const cfg = await prisma.webConfig.findUnique({ where: { id: 1 } });
  return cfg ?? { id: 1, webEnabled: true, placeholderEnabled: true, updatedAt: new Date() };
}

export async function setWebEnabled(enabled: boolean) {
  return prisma.webConfig.upsert({
    where: { id: 1 },
    update: { webEnabled: enabled },
    create: { id: 1, webEnabled: enabled },
  });
}

export async function setPlaceholderEnabled(enabled: boolean) {
  return prisma.webConfig.upsert({
    where: { id: 1 },
    update: { placeholderEnabled: enabled },
    create: { id: 1, placeholderEnabled: enabled },
  });
}

export async function listWebSources() {
  const sources = await prisma.webSource.findMany({ orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }] });
  return sources;
}

export async function upsertWebSource(label: string, domain: string, priority = 0, enabled = true) {
  return prisma.webSource.create({ data: { label, domain, priority, enabled } });
}

export async function toggleWebSource(id: number, enabled: boolean) {
  return prisma.webSource.update({ where: { id }, data: { enabled } });
}

export async function deleteWebSource(id: number) {
  return prisma.webSource.delete({ where: { id } });
}
