#!/usr/bin/env python
import os
import sys

dir_path = os.path.dirname(os.path.realpath(__file__))
sys.path.insert(0, dir_path + "/..")

from lib.config import config

import re
import socket
import time
import random
import pprint

from redis import StrictRedis

HOST = config["twitch_chat"]["host"]
PORT = int(config["twitch_chat"]["port"])
CHAN = config["twitch_chat"]["channel"]
NICK = config["twitch_chat"]["nickname"]
PASS = config["twitch_chat"]["oauth"]

TICK_DURATION = 15
SNEK_DIRECTIONS = ["up", "right", "down", "left"]
REDIS_KEY = "TWITCHSNEK:COMMANDS"

redis = StrictRedis(**config["redis"])

user_commands = dict()
previous_command = "down"

tick_timestamp = time.time()


def send_pong(msg):
    con.send(bytes('PONG %s\r\n' % msg, 'UTF-8'))


def send_message(chan, msg):
    con.send(bytes('PRIVMSG %s :%s\r\n' % (chan, msg), 'UTF-8'))


def send_nick(nick):
    con.send(bytes('NICK %s\r\n' % nick, 'UTF-8'))


def send_pass(password):
    con.send(bytes('PASS %s\r\n' % password, 'UTF-8'))


def join_channel(chan):
    con.send(bytes('JOIN %s\r\n' % chan, 'UTF-8'))


def part_channel(chan):
    con.send(bytes('PART %s\r\n' % chan, 'UTF-8'))


def get_sender(msg):
    result = ""
    for char in msg:
        if char == "!":
            break
        if char != ":":
            result += char
    return result


def get_message(msg):
    result = ""
    i = 3
    length = len(msg)
    while i < length:
        result += msg[i] + " "
        i += 1
    result = result.lstrip(':')
    return result


def parse_message(sender, msg):
    if len(msg) >= 1:
        msg = msg.split(' ')
        options = {'!snek': command_snek}

        if msg[0] in options:
            options[msg[0]](sender, msg)


def command_snek(sender, msg):
    if len(msg) > 1:
        if msg[1].lower() in SNEK_DIRECTIONS:
            if sender not in user_commands:
                user_commands[sender] = msg[1].lower()


def process_user_commands():
    global previous_command

    command_senders = {
        "up": list(),
        "right": list(),
        "down": list(),
        "left": list()
    }

    command_counts = {
        "up": 0,
        "right": 0,
        "down": 0,
        "left": 0
    }

    for user, command in user_commands.items():
        command_senders[command].append(user)
        command_counts[command] += 1

    pprint.pprint(command_senders)
    pprint.pprint(command_counts)
    print("")

    max_count = max(command_counts.values())

    snek_commands = list()

    for command, count in command_counts.items():
        if count == max_count:
            snek_commands.append(command)

    snek_command = random.choice(snek_commands)

    if len(command_senders[snek_command]):
        redis.lpush(
            config["twitch_snek"]["redis_key_messages"],
            f"{', '.join(command_senders[snek_command])} caused the snek to go {snek_command}!"
        )
        previous_command = snek_command
    else:
        snek_command = previous_command

        redis.lpush(
            config["twitch_snek"]["redis_key_messages"],
            f"Chat was lazy... snek keeps going {snek_command}!"
        )

    return snek_command


def dispatch_snek_command(snek_command):
    redis.lpush(REDIS_KEY, snek_command)


con = socket.socket()
con.connect((HOST, PORT))

con.settimeout(1)

send_pass(PASS)
send_nick(NICK)
join_channel(CHAN)

data = ""

while True:
    try:
        data = data+con.recv(1024).decode('UTF-8')

        data_split = re.split(r"[~\r\n]+", data)
        data = data_split.pop()

        for line in data_split:
            line = str.rstrip(line)
            line = str.split(line)

            if len(line) >= 1:
                if line[0] == 'PING':
                    send_pong(line[1])

                if line[1] == 'PRIVMSG':
                    sender = get_sender(line[0])
                    message = get_message(line)
                    parse_message(sender, message)
    except socket.timeout:
        now = time.time()

        if now - tick_timestamp >= TICK_DURATION:
            tick_timestamp = now

            snek_command = process_user_commands()
            dispatch_snek_command(snek_command)

            user_commands = dict()
    except socket.error:
        print("Socket died")
