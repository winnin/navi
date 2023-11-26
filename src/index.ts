import * as dotenv from 'dotenv'
dotenv.config()
import { App } from '@slack/bolt'
import {callOpenAI} from './openai'

const token = process.env.SLACK_BOT_TOKEN

const loadingAnswerMessage = process.env.LOADING_MESSAGE
const errorMessage = process.env.ERROR_MESSAGE


// Initializes your app with your bot token and signing secret
const app = new App({
  token,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  port: +process.env.PORT || 3000,
})



const findOriginalMessage = async function (channel, ts) {
  let originalMessage, cursor
  while (originalMessage == null) {
    const replies = await app.client.conversations.replies({
      token,
      channel,
      ts,
      cursor,
    })
    originalMessage = replies.messages.find((r) => r.thread_ts === r.ts) // if thread_ts === ts is the first message
    cursor = replies.cursor
    if (!replies.has_more) {
      // Sanity check
      break
    }
  }
  return originalMessage
}

app.event('app_mention', async ({ event, say }) => {
  const threadTs = event.thread_ts || event.ts
  const sentMessage = await say({
    text: loadingAnswerMessage,
    thread_ts: threadTs,
  })

  const isThread = event.thread_ts != null && event.ts !=null && event.thread_ts !== event.ts
  let message = event
  // if is in a thread and the message is just @App we are going to ask the original message
  if(isThread){
    const textMessageWithoutUserHandles = event.text.replaceAll(/<@\w+>/g,'').trim()
    const isEmptyMessage = !textMessageWithoutUserHandles
    if(isEmptyMessage){
      const originalMessage = await findOriginalMessage(message.channel, threadTs)
      message = originalMessage
    }
  }
  const assistanteResponse = await callOpenAI(message.text.replaceAll(/<@\w+>/g,'').trim(), threadTs)
  
  app.client.chat.update({
    text: `<@${message.user}> ${assistanteResponse?assistanteResponse.content[0].text.value?.replaceAll(/【[^】]+】/g,''): errorMessage}`,
    token,
    channel:sentMessage.channel,
    ts:sentMessage.ts
  })
  
})

app.start().then(() => console.log('⚡️ Bolt app is running!'))
