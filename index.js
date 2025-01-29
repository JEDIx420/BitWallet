import 'dotenv/config'
import { MongoClient } from 'mongodb'
import TelegramApi from 'node-telegram-bot-api'
import Web3 from 'web3'

const { BOT_TOKEN, MONGODB_URI, STICKER, ETH_API, BNB_API, MATIC_API, AVAX_API, FTM_API } = process.env

const client = new MongoClient(MONGODB_URI)
await client.connect()

const db = client.db('bitwallet')
const users = db.collection('users')

const ethWeb3 = new Web3(ETH_API)
const bnbWeb3 = new Web3(BNB_API)
const maticWeb3 = new Web3(MATIC_API)
const avaxWeb3 = new Web3(AVAX_API)
const ftmWeb3 = new Web3(FTM_API)

const bot = new TelegramApi(BOT_TOKEN, { polling: true })

bot.setMyCommands([
  { command: '/start', description: 'Let’s go!' },
  { command: '/help', description: 'How this works' }
])

bot.on('message', async msg => {
  const text = msg.text
  const chatId = msg.chat.id

  try {
    if (text === '/start') {
      await bot.sendSticker(chatId, STICKER)
      await bot.sendMessage(chatId,
        `🚀 Yo ${msg.from.first_name}! Welcome to BitWallet.
        
        🔍 Check your crypto balances with zero effort.
        
        👉 Just drop a wallet address and I’ll fetch the deets for ya.
        `
      )

      await users.findOne({ id: chatId }).then(async res => {
        if (!res) {
          await users.insertOne({
            id: chatId,
            username: msg.from.username,
            first_name: msg.from.first_name,
            last_name: msg.from.last_name,
            start_date: new Date()
          })
        }
      })
    } else if (text === '/help') {
      await bot.sendMessage(chatId,
        `🤖 Super easy to use:
        
        ✅ Drop a wallet address
        ✅ I’ll fetch your balance across major chains
        ✅ Profit 💰
        
        Example: 0xb85eaf59e6dc69ac7b6d92c6c24e1a83b582b293`
      )
    } else {
      const isAddress = await bnbWeb3.utils.isAddress(text)

      if (isAddress) {
        const botMsg = await bot.sendMessage(chatId, 'Hold up... Checking 🧐')
        const botMsgId = botMsg.message_id

        const eth = await ethWeb3.eth.getBalance(text)
        const bnb = await bnbWeb3.eth.getBalance(text)
        const matic = await maticWeb3.eth.getBalance(text)
        const avax = await avaxWeb3.eth.getBalance(text)
        const ftm = await ftmWeb3.eth.getBalance(text)
        
        bot.deleteMessage(chatId, botMsgId)
        bot.sendMessage(chatId,
          `💎 Here’s what you got:
          
          🏦 ${bnbWeb3.utils.fromWei(eth, 'ether')} ETH
          🔥 ${bnbWeb3.utils.fromWei(bnb, 'ether')} BNB
          🚀 ${bnbWeb3.utils.fromWei(matic, 'ether')} MATIC
          ❄️ ${bnbWeb3.utils.fromWei(avax, 'ether')} AVAX
          👻 ${bnbWeb3.utils.fromWei(ftm, 'ether')} FTM`
        )

        await users.updateOne({ id: chatId },
          {
            $set: {
              username: msg.from.username,
              first_name: msg.from.first_name,
              last_name: msg.from.last_name,
              date_last_call: new Date(),
              last_call: text
            },
            $inc: { number_calls: 1 },
            $push: {
              calls: {
                call: text,
                date: new Date()
              }
            }
          }
        )
      } else {
        await bot.sendMessage(chatId, '❌ That doesn’t look like a wallet address, fam.')
        
        await users.updateOne({ id: chatId },
          {
            $set: {
              username: msg.from.username,
              first_name: msg.from.first_name,
              last_name: msg.from.last_name,
              date_last_bad_call: new Date(),
              last_bad_call: text
            },
            $inc: { number_bad_calls: 1 },
            $push: {
              bad_calls: {
                call: text,
                date: new Date()
              }
            }
          }
        )
      }
    }
  } catch (err) {
    await bot.sendMessage(chatId, '😵 Oops, something broke. Try again!')
  }
})
