import { getWorker } from "../core/worker"
import * as activities from './activities';
import { WORKFLOW_EXECUTION_QUEUE, WORKFLOW_PATH } from "./workflow";

const subscriptionWorker = getWorker(WORKFLOW_PATH, WORKFLOW_EXECUTION_QUEUE, activities)
subscriptionWorker().catch((err) => {
  console.error(err);
  process.exit(1);
});