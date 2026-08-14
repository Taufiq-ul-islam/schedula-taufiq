import { BadRequestException } from '@nestjs/common';

export const RESCHEDULE_CANCEL_CUTOFF_MINUTES = 30;

/**
 * Shared by both cancel and reschedule flows. Throws if the target
 * appointment is already in the past, or is within the cutoff window of
 * its scheduled time. `action` is used only for the error message
 * ('cancel' / 'reschedule').
 */
export function ensureNotWithinCutoff(date: string, time: string, action: string): void {
  const apptDateTime = new Date(`${date}T${time}:00`);
  const diffMinutes = (apptDateTime.getTime() - Date.now()) / 60000;

  if (diffMinutes < 0) {
    throw new BadRequestException(`Cannot ${action} a past appointment`);
  }
  if (diffMinutes < RESCHEDULE_CANCEL_CUTOFF_MINUTES) {
    throw new BadRequestException(
      `Cannot ${action} within ${RESCHEDULE_CANCEL_CUTOFF_MINUTES} minutes of the appointment time`,
    );
  }
}
