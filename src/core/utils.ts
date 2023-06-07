import * as wf from '@temporalio/workflow';

export function until (condition: boolean) {
  return {
    orTimeout: async(timeout: string | number) => {
      if(await wf.condition(() => condition, timeout)) {
        return [true, false]
      } else {
        return [false, true]
      }
    }
  }
}