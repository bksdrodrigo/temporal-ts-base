import * as wf from '@temporalio/workflow';
import { until } from '../core/utils';
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
  formFilled: wf.defineSignal('formFilledSignal'),
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
    periodGivenForFormFilling, reminderLimit, formFilingReminderDuration
  } = workflowState;
  
  // Destruct the signals used in workflow and define the handlers
  /// NB: workflow state can only be mutated within a signal handlers and activities ONLY. 
  /// NEVER mutate workflow state within a query
  /// We can pass the workflow state to activities so they can read about the workflow state
  const { formFilled: formFilled } = signals
  const {getWorkflowState} = queries
  wf.setHandler(formFilled, () => void ( workflowState.newEmployeeFormFilled = true ))
  wf.setHandler(getWorkflowState, ()=>workflowState)

  // list destruct the activities we are going to use within the workflow
  const {sendWelcomeEmail,sendThankyouEmail, sendReminderEmail, creteFollowupTask, updateFollowUpTask: updateFollowUpTask, completeFollowupTask: completeFollowupTask} = act;
  

   // eslint-disable-next-line no-constant-condition
   while(true) {
    workflowState = await sendWelcomeEmail(workflowState);
    logger.info('Employee Welcome Email Sent: ', {workflowState});
    const [isFormFilled, periodGivenForFormFillingExpired] = await until(workflowState.newEmployeeFormFilled).orTimeout(periodGivenForFormFilling)
    if(isFormFilled) {
      logger.info('Employee Filled New Employee Form: ', {workflowState});
      workflowState = await completeFollowupTask(workflowState)
      logger.info('Any Followup Tasks are closed: ', {workflowState});
      workflowState   = await sendThankyouEmail(workflowState)
      logger.info('Thankyou Email Sent: ', {workflowState});
      break;
    } else if(periodGivenForFormFillingExpired) {
      // timeout
      logger.info('Timeout for user to fill the form expired: ', {});
      for(let i=1; i<reminderLimit; i++) {
        logger.info('Proceeding with Reminder cycle: ', {i});
        workflowState = await sendReminderEmail(workflowState)
        logger.info('Reminder Email Sent', {workflowState});
        workflowState = workflowState.followUpTaskCreated? await updateFollowUpTask(workflowState) : await creteFollowupTask(workflowState)
        logger.info('Updating followup Task to increase priority', {workflowState});
        const [isFormFilled, formFilingReminderDurationExpired] = await until(workflowState.newEmployeeFormFilled).orTimeout(formFilingReminderDuration)
        if(isFormFilled) {
          logger.info('Updating followup Task to increase priority', {workflowState});
          break;
        } else if (formFilingReminderDurationExpired) {
          continue;
        }
        
      }
    }
   }
   return workflowState;
}

