import { getContext } from '../core/activity.interceptors';
import { HRFollowUpTask, SampleWorkflowState } from "./workflow";

export async function greet(name: string): Promise<string> {
  const { logger } = getContext();
  logger.info('Log from activity', { name });
  return `Hello, ${name}!`;
}

export async function sendWelcomeEmail(workflowState: SampleWorkflowState): Promise<SampleWorkflowState> {
  const {logger} = getContext()
  const { employee: {
    email,
  }, welcomeEmailSent } = workflowState;
  if(welcomeEmailSent) return {...workflowState}
  // TODO: emailing logic goes here
  logger.info(`Sending email to ${email}`)
  const newState = {...workflowState, welcomeEmailSent: true}
  logger.info(JSON.stringify(newState))
  return newState;
}

export async function sendThankyouEmail(workflowState: SampleWorkflowState): Promise<SampleWorkflowState> {
  const {logger} = getContext()
  const { employee: {
    email,
  }, thankyouEmailSent } = workflowState;
  if(thankyouEmailSent) return {...workflowState}
  // TODO: emailing logic goes here
  logger.info(`Thank you email sent to: ${email}`)
  const newState = {...workflowState, thankyouEmailSent: true}
  logger.info(JSON.stringify(newState))
  return newState;
}

export async function sendReminderEmail(workflowState: SampleWorkflowState): Promise<SampleWorkflowState> {
  const {logger} = getContext()
  const { employee: {
    email,
  }, numberOfRemindersSent } = workflowState;
  // TODO: emailing logic goes here

  const newNumberOfReminders = numberOfRemindersSent + 1
  const newState = {...workflowState, numberOfRemindersSent: newNumberOfReminders}
  logger.info('Reminder Email Sent to: '+email)
  logger.info(JSON.stringify(newState))
  return newState;
}

export async function creteFollowupTask(workflowState: SampleWorkflowState): Promise<SampleWorkflowState> {
  const {logger} = getContext()
  const { numberOfRemindersSent, followUpTaskCreated, employee: { firstName, lastName, email} } = workflowState;
  if (followUpTaskCreated) return workflowState
  const followUpTask: HRFollowUpTask = {
    id: "001",
    name: `Remind ${firstName} ${lastName} (${email}) to fill the New Employee form`,
    priority: numberOfRemindersSent<=1 ? 'NORMAL' : numberOfRemindersSent <=2 ? 'HIGH' : 'CRITICAL',
    status: "NEW"
  }
  const newState = {...workflowState, followUpTaskCreated: true, followUpTask}
  logger.info('Create Followup Task')
  logger.info(JSON.stringify(newState))
  return newState;
}

export async function updateFollowUpTask(workflowState: SampleWorkflowState): Promise<SampleWorkflowState> {
  const {logger} = getContext()
  const { numberOfRemindersSent, followUpTask } = workflowState;

  const updatedFollowUpTask: HRFollowUpTask = {
    ...(followUpTask as HRFollowUpTask),
    priority: numberOfRemindersSent<=1 ? 'NORMAL' : numberOfRemindersSent <=2 ? 'HIGH' : 'CRITICAL',
    status: 'IN-PROGRESS'
  }
  const newState = {...workflowState, followUpTaskCreated: true, followUpTask: updatedFollowUpTask}
  logger.info('Updated Followup Task')
  logger.info(JSON.stringify(newState))
  return newState;
}

export async function completeFollowupTask(workflowState: SampleWorkflowState): Promise<SampleWorkflowState> {
  const {logger} = getContext()
  const { followUpTask } = workflowState;

  if (followUpTask) {
    const updatedFollowUpTask: HRFollowUpTask = {
      ...(followUpTask as HRFollowUpTask),
      status: 'COMPLETED'
    }
    const newState = {...workflowState, followUpTaskCreated: true, followUpTask: updatedFollowUpTask}
    logger.info(`Completed Follow up Task`)
    logger.info(JSON.stringify(newState))
    return newState;
  }
  return workflowState;
}
