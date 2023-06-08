import * as wf from '@temporalio/workflow';
import { untilSatisfied } from '../core/utils';
// Only import the activity types
import * as activities from './activities';

export const WORKFLOW_EXECUTION_QUEUE = 'sample-workflow'
export const WORKFLOW_PATH = 'sample_workflow/workflow'

export type Employee = {
  id?: string,
  email: string;
  firstName: string,
  lastName: string
};

export type HRFollowUpTask = {
  id: string,
  name: string,
  priority: 'NORMAL' | 'HIGH' | 'CRITICAL',
  status: 'NEW' | 'IN-PROGRESS' | 'COMPLETED'
}

export type SampleWorkflowState = {
  employee: Employee,
  welcomeEmailSent: boolean,
  periodGivenForFormFilling: string | number,
  reminderLimit: number,
  numberOfRemindersSent: number,
  formFilingReminderDuration: string | number,
  newEmployeeFormFilled: boolean,
  thankyouEmailSent: boolean,
  followUpTaskCreated: boolean,
  followUpTask: HRFollowUpTask | undefined,
}

export const signals = {
  formFilledSignal: wf.defineSignal('formFilledSignal'),
}
export const queries = {
  getWorkflowState: wf.defineQuery<SampleWorkflowState | undefined>('getWorkflowState')
}

const act = wf.proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
})

const { defaultWorkerLogger: logger } = wf.proxySinks<wf.LoggerSinks>();

export async function SampleWorkflow(initialState: SampleWorkflowState): Promise<SampleWorkflowState> {
  // define the workflow state
  let workflowState = { ...initialState };
  const {
    periodGivenForFormFilling, formFilingReminderDuration, reminderLimit
  } = workflowState;
  let reminderCount = 1 // This has to start from 1 since we use do loops 
  // Destruct the signals used in workflow and define the handlers
  /// NB: workflow state can only be mutated within a signal handlers and activities ONLY. 
  /// NEVER mutate workflow state within a query
  /// We can pass the workflow state to activities so they can read about the workflow state
  const { formFilledSignal } = signals
  const {getWorkflowState} = queries
  wf.setHandler(formFilledSignal, () => void ( workflowState.newEmployeeFormFilled = true ))
  wf.setHandler(getWorkflowState, ()=>workflowState)

  // list destruct the activities we are going to use within the workflow
  const {sendWelcomeEmail,sendThankyouEmail, sendReminderEmail, creteFollowupTask, updateFollowUpTask: updateFollowUpTask, completeFollowupTask: completeFollowupTask} = act;

  // Start: 
  logger.info('Workflow Started', workflowState);
  // Activity:'sendWelcomeEmailWithFormLink'
  workflowState = await sendWelcomeEmail(workflowState)
  // eslint-disable-next-line no-constant-condition
  while(true) {
    // RaceCondition: Wait until 'newEmployeeFormFilled' is true Or 'periodGivenForFormFilling' expired
    logger.info(`RaceCondition: Wait until 'newEmployeeFormFilled' is true Or 'periodGivenForFormFilling' expired`, {});
    const [employeeFilledTheForm, periodGivenForFormFillingExpired] = await untilSatisfied(workflowState.newEmployeeFormFilled, periodGivenForFormFilling) 
    if(employeeFilledTheForm) {
      logger.info(`Employee Filled the Form`, {});
      // Activity:'completeFollowupTaskIfExists' called
      logger.info(`Activity:'completeFollowupTaskIfExists' called`, {});
      workflowState = await completeFollowupTask(workflowState)

      // Activity:'sendThankyouEmail' called
      logger.info(`Activity:'sendThankyouEmail' called`, {});
      workflowState = await sendThankyouEmail(workflowState)
      break;
    } else if(periodGivenForFormFillingExpired) {
      logger.info(`Period given for Form filling has expired`, {});
      sendReminders:
      do { //Since Activity:'sendReminderEmail' has arrows both going out and coming in, workflow indicates a loop
        // Activity:'sendReminderEmail' called
        logger.info(`Activity:'sendReminderEmail' called`, {});
        workflowState = await sendReminderEmail(workflowState)

        logger.info(`Decision:'followUpTaskCreated' created?`, {});
        if(workflowState.followUpTaskCreated) {
          logger.info(`followUpTask Already Created`, {});
          // Activity:'updateFollowUpTaskPriority' called
          logger.info(`Activity:'updateFollowUpTask' called`, {});
          workflowState = await updateFollowUpTask(workflowState)
        } else {
          logger.info(`Followup Task Not Created`, {});
          // Activity:'creteFollowupTask' called
          logger.info(`Activity:'creteFollowupTask' called`, {});
          workflowState = await creteFollowupTask(workflowState)
        }
        // RaceCondition: Wait until 'newEmployeeFormFilled' is true Or 'formFilingReminderDuration' expired
        logger.info(`RaceCondition: Wait until 'newEmployeeFormFilled' is true Or 'formFilingReminderDuration' expired`, {});
        const [employeeFilledTheForm, formFilingReminderDurationExpired] = await untilSatisfied(workflowState.newEmployeeFormFilled, formFilingReminderDuration)
        logger.info(`RaceCondition: Values: Employee Filled the Form = ${employeeFilledTheForm}, Timeout = ${formFilingReminderDurationExpired}`, {});
        if(employeeFilledTheForm) {
          // NB: We are breaking out of the reminder loop, so the workflow main loop will handle the employee filled the form scenario
          logger.info(`Breaking the SendReminder Loop, reminderCount: ${reminderCount}`,{})
          break sendReminders //We break out of the reminder loop
        } else if(formFilingReminderDurationExpired) {
          // We need to facilitate Decision:'reminderLimit'>3 by increasing the reminderLimit of time expires
          logger.info(`Period in between reminders have expired. Increase the Reminder counter by one`, {});
          reminderCount++
        }
        logger.info(`Check reminderCount: ${reminderCount} < ${reminderLimit}`, {});
      } while(reminderCount < reminderLimit) // Decision:'reminderLimit'>3?
    }
  }
  // End:
  return workflowState
}

