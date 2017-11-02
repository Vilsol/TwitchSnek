import asyncio
import aioredis

from autobahn.asyncio.wamp import ApplicationSession, ApplicationRunner
from autobahn.wamp import auth

from lib.config import config


class SnekCommandDispatcherComponent:
    @classmethod
    def run(cls):
        print(f"Starting {cls.__name__}...")

        url = "ws://%s:%s" % (config["crossbar"]["host"], config["crossbar"]["port"])

        runner = ApplicationRunner(url=url, realm=config["crossbar"]["realm"])
        runner.run(SnekCommandDispatcherWAMPComponent)


class SnekCommandDispatcherWAMPComponent(ApplicationSession):
    def __init__(self, c=None):
        super().__init__(c)

    def onConnect(self):
        self.join(config["crossbar"]["realm"], ["wampcra"], config["crossbar"]["auth"]["username"])

    def onDisconnect(self):
        print("Disconnected from Crossbar!")

    def onChallenge(self, challenge):
        secret = config["crossbar"]["auth"]["password"]
        signature = auth.compute_wcs(secret.encode('utf8'), challenge.extra['challenge'].encode('utf8'))

        return signature.decode('ascii')

    async def onJoin(self, details):
        redis = await aioredis.create_connection(
            (config["redis"]["host"], config["redis"]["port"]),
            loop=asyncio.get_event_loop()
        )

        while True:
            snek_command = await redis.execute(
                "brpop",
                config["twitch_snek"]["redis_key_commands"],
                config["twitch_snek"]["redis_key_messages"],
                0
            )

            message = snek_command[1].decode("utf-8")

            if snek_command[0].decode("utf-8") == config["twitch_snek"]["redis_key_commands"]:
                self.publish("TWITCHSNEK:COMMANDS", message)
            elif snek_command[0].decode("utf-8") == config["twitch_snek"]["redis_key_messages"]:
                print(message)
                self.publish("TWITCHSNEK:MESSAGES", message)
