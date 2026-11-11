import { prisma } from './prisma';

export async function logInventoryActivity({
  inventoryId,
  userId,
  action,
  oldData,
  newData,
}: {
  inventoryId: string;
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  oldData?: any;
  newData?: any;
}) {
  try {
    await prisma.inventoryActivityLog.create({
      data: {
        inventory_id: inventoryId,
        user_id: userId,
        action,
        old_data: oldData ? JSON.stringify(oldData) : null,
        new_data: newData ? JSON.stringify(newData) : null,
      },
    });
  } catch (error) {
    console.error('Failed to log inventory activity:', error);
  }
}
