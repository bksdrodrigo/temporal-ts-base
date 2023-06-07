import { getWorker } from "../core/worker"
import * as activities from './activities';
import { WORKFLOW_EXECUTION_QUEUE, WORKFLOW_PATH } from "./workflow";

const sampleWorker = getWorker(WORKFLOW_PATH, WORKFLOW_EXECUTION_QUEUE, activities)
sampleWorker().catch((err) => {
  console.error(err);
  process.exit(1);
});