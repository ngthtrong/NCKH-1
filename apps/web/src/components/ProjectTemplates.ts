import { boardsApi } from '../api/endpoints';
import type { UUID } from '../api/types';

export type ProjectTemplateId = 'STANDARD' | 'NCKH' | 'CAPSTONE';

export interface ProjectTemplateOption {
  id: ProjectTemplateId;
  name: string;
  badge: string;
  description: string;
  stages: string[];
}

export const projectTemplates: ProjectTemplateOption[] = [
  {
    id: 'STANDARD',
    name: 'Kanban tiêu chuẩn',
    badge: 'Mặc định',
    description: 'Quy trình Kanban cơ bản, phù hợp với hầu hết các đội nhóm.',
    stages: ['Chờ thực hiện', 'Đang xử lý', 'Hoàn thành'],
  },
  {
    id: 'NCKH',
    name: 'Đề tài NCKH Sinh viên',
    badge: 'NCKH',
    description: 'Mô hình NCKH: Tổng quan tài liệu -> Thiết kế thực nghiệm -> Thu thập dữ liệu -> Viết báo cáo -> Nghiệm thu',
    stages: ['Tổng quan tài liệu', 'Thiết kế thực nghiệm', 'Thu thập dữ liệu', 'Viết báo cáo', 'Nghiệm thu'],
  },
  {
    id: 'CAPSTONE',
    name: 'Đồ án môn học / Capstone (Scrum)',
    badge: 'Scrum',
    description: 'Mô hình Agile: Yêu cầu -> Thiết kế -> Lập trình -> Kiểm thử -> Hoàn thành',
    stages: ['Yêu cầu', 'Thiết kế', 'Lập trình', 'Kiểm thử', 'Hoàn thành'],
  },
];

export async function applyProjectTemplate(boardId: UUID, templateId: ProjectTemplateId): Promise<void> {
  if (templateId === 'STANDARD') return;
  const template = projectTemplates.find((t) => t.id === templateId);
  if (!template || typeof boardsApi?.get !== 'function') return;

  try {
    const board = await boardsApi.get(boardId);
    if (!board || !Array.isArray(board.columns)) return;

    const stages = template.stages.map((name, index) => ({
      name,
      completed: index === template.stages.length - 1,
    }));

    let currentVersion = board.version;

    for (let i = 0; i < Math.min(board.columns.length, stages.length); i++) {
      const updated = await boardsApi.updateColumn(boardId, board.columns[i].id, {
        name: stages[i].name,
        completed: stages[i].completed,
        version: currentVersion,
      });
      currentVersion = updated.version;
    }

    for (let i = board.columns.length; i < stages.length; i++) {
      const updated = await boardsApi.createColumn(boardId, {
        name: stages[i].name,
        completed: stages[i].completed,
        version: currentVersion,
      });
      currentVersion = updated.version;
    }
  } catch (error) {
    console.warn('Unable to apply template columns to board:', error);
  }
}
