# Slackbot code

import slack

# File manager Token
SLACK_TOKEN="xoxb-1013538707075-4647934832982-ocKMFMNpTAEN52EVXcj3Zr1m"

# Create the client
client = slack.WebClient(token=SLACK_TOKEN)

client.chat_postMessage(channel='#bot-test',text='Hello')