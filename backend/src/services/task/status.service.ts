import { logger } from '../../utils/logger';

export type TaskStatus = 'assigned' | 'in_progress' | 'completed';

export class TaskStatusService {
  private static readonly validTransitions: Record<TaskStatus, TaskStatus[]> = {
    assigned: ['in_progress', 'completed'],
    in_progress: ['completed'],
    completed: [],
  };

  /**
   * Validate if a status transition is allowed
   * @param currentStatus - Current task status
   * @param newStatus - Desired new status
   * @returns True if transition is valid, false otherwise
   */
  static isValidTransition(currentStatus: TaskStatus, newStatus: TaskStatus): boolean {
    if (currentStatus === newStatus) {
      return true; // Same status is always valid
    }

    const allowedTransitions = this.validTransitions[currentStatus];
    return allowedTransitions.includes(newStatus);
  }

  /**
   * Get allowed transitions for a given status
   * @param currentStatus - Current task status
   * @returns Array of allowed next statuses
   */
  static getAllowedTransitions(currentStatus: TaskStatus): TaskStatus[] {
    return this.validTransitions[currentStatus];
  }

  /**
   * Validate status value
   * @param status - Status to validate
   * @returns True if status is valid
   */
  static isValidStatus(status: string): status is TaskStatus {
    return ['assigned', 'in_progress', 'completed'].includes(status);
  }

  /**
   * Get transition error message
   * @param currentStatus - Current status
   * @param newStatus - Attempted new status
   * @returns Error message
   */
  static getTransitionError(currentStatus: TaskStatus, newStatus: TaskStatus): string {
    if (currentStatus === 'completed') {
      return 'Cannot change status of a completed task';
    }

    const allowed = this.getAllowedTransitions(currentStatus);
    return `Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${allowed.join(', ')}`;
  }
}
