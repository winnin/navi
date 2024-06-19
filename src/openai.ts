//import OpenAI from 'openai'
import { OpenAI } from "langchain/llms/openai";
import {OpenAIAssistantRunnable} from "langchain/experimental/openai_assistant"
import {getDb} from './rocksdb'
import { OpenAIAssistantFinish } from "langchain/dist/experimental/openai_assistant/schema";

const assistantId = process.env.OPENAI_ASSISTANT_ID

const agent = new OpenAIAssistantRunnable({assistantId,asAgent:true})
export async function callOpenAI (question:string, slackThreadId:string):Promise<string> {
  try{
    const db = getDb()
    const openAiThreadId = await db.get(`${slackThreadId}`).catch(err=>null)
    const args = {
      content:question,
      ...(openAiThreadId?{threadId:openAiThreadId}:{})
    }
    const {returnValues, threadId} = (await agent.invoke(args) as OpenAIAssistantFinish)
    if(!openAiThreadId){
      await db.put(`${slackThreadId}`,threadId)
    }
    return returnValues.output
  }catch(err){
    console.log(err)
    return null
  }
}

/*export async function callOpenAI (question, slackThreadId) {
  try{
    const db = getDb()
    let openAiThreadId = await db.get(`${slackThreadId}`).catch(err=>null)
    if(!openAiThreadId){
      const thread = await openai.beta.threads.create()
      openAiThreadId = thread.id
      await db.put(`${slackThreadId}`,thread.id)
    }
    await openai.beta.threads.messages.create(openAiThreadId, {
      role: 'user',
      content: question,
    })
    
    const assistant = await openai.beta.assistants.retrieve(assistantId)
    const run = await openai.beta.threads.runs.create(openAiThreadId, {
      assistant_id: assistant.id,
    })
    let runResult
    while (runResult == null) {
      const res = await openai.beta.threads.runs.retrieve(openAiThreadId, run.id)
      if (res.status === 'completed') {
        const messages = await openai.beta.threads.messages.list(openAiThreadId)
        runResult = messages.data[0]
      }
      if(['expired','cancelled','failed'].find(c=>c===res.status)){
        break
      }
    }

    return runResult
  }catch(err){
    console.log(err)
    return null
  }
}*/