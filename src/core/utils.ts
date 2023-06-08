import * as wf from '@temporalio/workflow';

export async function untilSatisfied(condition: boolean, timeout: string | number | undefined = undefined) {
  if(!timeout) {
    await wf.condition(()=>condition)
    return [true, undefined]
  }
  if(await wf.condition(()=>condition, timeout)) {
    return [true, false]
  } else {
    return [false, true]
  }
}
