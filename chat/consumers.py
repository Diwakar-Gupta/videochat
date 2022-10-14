# chat/consumers.py
from asgiref.sync import async_to_sync
import channels.layers
from channels.generic.websocket import WebsocketConsumer
import json


PREFIX_CHANNEL_NAME = 'specific..inmemory!'

class ChatConsumer(WebsocketConsumer):

    def set_display_name(self):
        self.display_name = self.channel_name.split('!')[1]

    @classmethod
    def display_name_2_channel_name(cls, display_name):
        return PREFIX_CHANNEL_NAME + display_name
    
    @classmethod
    def get_room_name(cls, channel_name1, channel_name2):
        return 'group1'

    def connect(self):
        self.set_display_name()

        self.accept()
        
        # Send message to WebSocket
        self.send(text_data=json.dumps({
            'type': 'login',
            'success': True,
            'id': self.display_name
        }))

    def disconnect(self, close_code):
        # Leave room group
        # async_to_sync(self.channel_layer.group_discard)(
        #     self.room_group_name,
        #     self.channel_name
        # )
        pass

    # Receive message from WebSocket
    def receive(self, text_data):
        data = json.loads(text_data)
        type = data['type']

        if type == 'offer':
            #for ex. UserA wants to call UserB 
            print(f'Sending offer from: {self.display_name} to: {data["name"]}');
            
            #if UserB exists then send him offer details  
            pear_channel_name = ChatConsumer.display_name_2_channel_name(data['name'])

            ChatConsumer.send_message_to_channel(
                pear_channel_name,
                {
                    "type": "offer",
                    "offer": data['offer'], 
                    "name": self.display_name, 
                }
            )

        elif type == 'answer':
            print(f'Sending answer from: {self.display_name} to: {data["name"]}'); 
                
            #for ex. UserB answers UserA 
            
            pear_channel_name = ChatConsumer.display_name_2_channel_name(data['name'])
            ChatConsumer.send_message_to_channel(
                pear_channel_name,
                {
                    "type": "answer", 
                    "answer": data['answer']
                }
            )
        elif type == "candidate": 
            print("Sending candidate to:", data['name']);  
            pear_channel_name = ChatConsumer.display_name_2_channel_name(data['name'])

            ChatConsumer.send_message_to_channel(
                pear_channel_name,
                {
                    "type": "candidate", 
                    "candidate": data['candidate']
                }
            )
        elif type == 'leave':
                print("TODO: Disconnecting from", data['name']); 
                # conn.otherName = null; 
                # sendTo(conn, { 
                #     type: "leave" 
                # }) 
        else:
            ChatConsumer.send_message_to_channel(
                pear_channel_name,
                {
                    "type": "error", 
                    "message": "Command no found: "+data['type']
                }
            )

    @classmethod
    def send_message_to_channel(cls, channel_name, message):
        channel_layer = channels.layers.get_channel_layer()
        async_to_sync(channel_layer.send)(
            channel_name,
            { 
                "type": "send_message",
                "message": message
            }
        )

    # Receive message of type offer
    def send_message(self, event):
        message = event['message']

        # Send message to WebSocket
        self.send(text_data=json.dumps(message))

