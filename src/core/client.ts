// import { Connection, Client } from '@temporalio/client';
// import { logSampleWorkflow } from './workflows';

// async function run() {
//   const connection = await Connection.connect(); // Connect to localhost with default ConnectionOptions.
//   // In production, pass options to the Connection constructor to configure TLS and other settings.
//   // This is optional but we leave this here to remind you there is a gRPC connection being established.

//   const client = new Client({
//     connection,
//     // In production you will likely specify `namespace` here; it is 'default' if omitted
//   });

//   // Invoke the `logSampleWorkflow` Workflow, only resolved when the workflow completes
//   await client.workflow.execute(logSampleWorkflow, {
//     taskQueue: 'instrumentation',
//     workflowId: 'instrumentation-sample-0',
//   });
// }

// run().catch((err) => {
//   console.error(err);
//   process.exit(1);
// });


import { Connection, WorkflowClient } from '@temporalio/client';

export async function getConnection(connectionSettings: any = {}){
  return await Connection.connect({ ...connectionSettings});
  // NB: In production, pass connection settings to configure TLS and other settings:
  // {
  //   address: 'foo.bar.tmprl.cloud',
  //   tls: {}
  // }
}

export function getNewClient(connection: any, clientSettings: any = {}): WorkflowClient {
  return new WorkflowClient({
    connection,
    ...clientSettings, // namespace: 'foo.bar', // NB: connects to 'default' namespace if not specified
  });
}

// export function getWorkflowHndle(client: Client, workflowId: string) {
//   return client.getHandle(workflowId); 
// }

export async function startWorkflow(client: WorkflowClient, workflow: any,
  workflowExecutionArguments: any,
  workflowExecuteQueue: any,
  workflowExecutionId: any) {
  const handle = await client.start(workflow, {
    args: [workflowExecutionArguments],
    taskQueue: workflowExecuteQueue,
    // NB: in practice, use a meaningful business ID, like customerId or transactionId
    workflowId: workflowExecutionId,
  });
  console.log(`Started workflow ${handle.workflowId}`);
  return handle;
}


