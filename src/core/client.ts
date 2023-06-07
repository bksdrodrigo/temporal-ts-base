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


