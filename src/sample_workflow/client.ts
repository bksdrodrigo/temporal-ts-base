import { SampleWorkflow , signals, queries, SampleWorkflowState, WORKFLOW_EXECUTION_QUEUE} from './workflow';
import { nanoid } from 'nanoid';
import { getConnection, getNewClient, startWorkflow } from '../core/client'

export async function run() {
  const workflowExecutionArguments: SampleWorkflowState = {
    employee: {
      id: 'emp0000057',
      email: 'surenr@99x.io',
      firstName: 'Suren',
      lastName: 'Rodrigo'
    },
    welcomeEmailSent: false,
    periodGivenForFormFilling: '50 seconds',
    reminderLimit: 4,
    numberOfRemindersSent: 0,
    formFilingReminderDuration: '10 seconds',
    newEmployeeFormFilled: false,
    thankyouEmailSent: false,
    followUpTaskCreated: false,
    followUpTask: undefined
  }
  const workflowExecuteQueue = WORKFLOW_EXECUTION_QUEUE;
  const workflowExecutionId = `${WORKFLOW_EXECUTION_QUEUE}-workflow-${nanoid()}`;

  const connection = await getConnection();
  const client = getNewClient(connection);

  const handle = await startWorkflow(client, SampleWorkflow,
    workflowExecutionArguments, 
    workflowExecuteQueue, 
    workflowExecutionId).catch(error => {
      console.error(error);
      process.exit(1);
  })
  return handle;
 
}
(run().then(async (handle) => {
  console.log('Workflow Handle:')
  console.log(`Workflow ID for handle: ${handle.workflowId}`)
  console.log(await handle.query(queries.getWorkflowState))
  // NB: We can now interact with the workflow by querying the workflow status and sending signals to
  /// Interact with the workflow using the handle we have obtained 
  // setTimeout(async () => {
  //   console.log('Sending Cancellation signal to workflow..');
  //   await handle.signal(signals.cancelSubscription)
  // }, 10000)

  // NB: Below is how you need to create a handle from the workflow ID and interact with any workflow
  setTimeout(async () => {
    console.log('Creating new connection..')
    const newConnection = await getConnection()
    console.log('Creating new client..')
    const newClient = getNewClient(newConnection)
    console.log(`Obtaining and handle to the workflow with ID: ${handle.workflowId}`)
    console.log(await handle.query(queries.getWorkflowState))
    const workflowHandle = newClient.getHandle(handle.workflowId)
    console.log('Sending formFilledSignal signal')
    await workflowHandle.signal(signals.formFilledSignal) // await for the results for the signal
    console.log(await handle.query(queries.getWorkflowState)) // we can see immediately the impact of cancellation
  }, 75000)

}).catch(error=> {
  console.error(error);
  process.exit(1)
}))