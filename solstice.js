"use strict";

const Discord = require("discord.js");
const bot = new Discord.Client();
const settings = require("./settings.js");
const ytdl = require('ytdl-core');
const fs = require('fs');
const stream = require('stream');
var playing = false;
var queue = [];

let dispatcher, userVoice; //That's the voice channel the bot is talking in

function checkQueue(msg){
	if(!playing && queue.length > 0){
		var item = queue.shift();
		playFromQueue(msg,item);
	} 
}

function addtoQueue(msg,item){
	queue.push(item);
	msg.channel.sendMessage(item["name"] + " was added to queue! Position: " + parseInt(queue.length));
}

function nextInQueue(msg){
	const userVoiceID = msg.member.voiceChannelID;
	userVoice = msg.guild.channels.get(userVoiceID);
	userVoice.leave();
	dispatcher = null;
	playing = false;	
	checkQueue(msg);
}

function playFromQueue(msg,item){
	msg.channel.sendMessage("Now Playing: " + item["name"]);
	const userVoiceID = msg.member.voiceChannelID;
	userVoice = msg.guild.channels.get(userVoiceID);
	userVoice.join().then(connection => {
		if(item["stream"]){
			dispatcher = connection.playStream(ytdl(item["value"], { 'filter': "audioonly",'quality':'lowest' }));			
		} else {
			dispatcher = connection.playFile(item["value"]);
		}
		
		dispatcher.on('end',function(){
			nextInQueue(msg);
		});
		
		dispatcher.on('error',function(err){
			console.log("dispatch error: " + err);
			nextInQueue(msg);
		});	
		playing = true;		
	});
};

//Debug
const debug = function (msg) {	
	console.log("debug");
};
//Ping, Pong!
const ping = function (msg) {
    msg.channel.sendMessage("WOCHENENDE!");
};
//Stop the current node.js process with an exit message - if called by the bot owner, only. 
const terminate = function (msg) {
    if (msg.author.id === settings.owner_id) {
        msg.channel.sendMessage("Ich hasse Montage :(");
		disconnect;
        setTimeout(process.exit,1000);
    } else {
        msg.channel.sendMessage("Alter! Ernsthaft! Halts Maul!");
    }
};
//Play a predefined file (see files object)
const play = function (msg) {
    const files = {
        cena: "cena.mp3",
        holzbrett: "holzbrett.mp3"
    };
    var call = msg.content.substring(settings.prefix.length);
    call = call.split(" ");
	
    if (call[1]) {
        var file = files[call[1]];
		
        if (call[1].toLowerCase() in files) {
			var item = {"name":call[1],"stream":false,"value":"./sounds/"+files[call[1]]};
			addtoQueue(msg,item);
			checkQueue(msg);
			
        } else if(call[1].startsWith("https://youtu.be") || call[1].startsWith("https://www.youtube.com")) {
            msg.channel.sendMessage("Suche nach dem Video");
			var ytInfo = ytdl.getInfo(call[1], { filter: "audioonly" },function(err, info){
				if(!err){
					var item = {"name":info["title"],"stream":true,"value":call[1]};
					addtoQueue(msg,item);
					checkQueue(msg);
				} else {
					msg.channel.sendMessage("Fehler!");
					console.log(err);
				}
			});
			
        } else {
			msg.channel.sendMessage("Was kannst du eigentlich?");
		}

    } else {
        msg.channel.sendMessage("Wie dumm bist du? Es heißt `" + settings.prefix + "play [filename/link]`");
    }
};

const infoQueue = function(msg){
	var msgString = "Currently in Queue: \n" ;
	var i = 1;
	var item;
	
	queue.forEach(function(item){
		msgString += i + ": " + item["name"] + "\n";
		i+=1;
	});
	msg.channel.sendMessage(msgString);
}

const nextSong = function(msg){
	const userVoiceID = msg.member.voiceChannelID;
	userVoice = msg.guild.channels.get(userVoiceID);
	userVoice.leave();
	dispatcher = null;
	playing = false;
}

//Disconnect the bot from the voice channel.
const disconnect = function (msg) {
    if (dispatcher) {
        dispatcher.end("Halted by user");
        userVoice.leave();
        msg.channel.send("Left voice channel.");
        dispatcher = null;
    } else {
        msg.channel.send("Not in a voice channel!");
    }
}
//Return information about the user
const userinfo = function (msg) {
    /*
    var reply = new Discord.RichEmbed();
    reply.color = 0;
    reply.addField(msg.author.username+"#"+msg.author.discriminator);
    msg.channel.sendMessage(reply);
    */
};
//For the loods
const fuck = function (msg) {
    msg.channel.sendMessage("Wow, no, you l00d.");
};

const commands = {
    debug: debug,
    ping: ping,
    play: play,
	next: nextSong,
	queue: infoQueue,
    disconnect: disconnect,
    dc: disconnect,
    userinfo: userinfo,
    fuck: fuck,
    die: terminate,
    terminate: terminate
};

bot.on("message", msg => {
    if (msg.content.startsWith(settings.prefix) && !msg.author.bot) {
        var call = msg.content.substring(settings.prefix.length);
        call = call.split(" ");
        if (call[0] in commands) {
            console.log(msg.author.username + " called command: " + call);
            var fn = commands[call[0]];
            if (typeof fn === 'function') {
                fn(msg);
            } else {
                console.log("couldn't find function");
            }
        } else {
            console.log(msg.author.username + " called an unknown command: " + call);
            msg.channel.sendMessage("Unknown command.");
        }
    }
});

bot.on("ready", () => {
    console.log("Solstice is ready.");
});

bot.login(settings.token);