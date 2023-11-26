import OpenAI from 'openai'
import {getDb} from './rocksdb'

const assistantId = process.env.OPENAI_ASSISTANT_ID

const openai = new OpenAI()

export async function callOpenAI (question, slackThreadId) {
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
}