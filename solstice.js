"use strict";

const Discord = require("discord.js");
const bot = new Discord.Client();
const settings = require("./settings.js");
const ytdl = require('ytdl-core');
const fs = require('fs');
const stream = require('stream');
var playing = false;
var queue = [];

let dispatcher, userVoice, VoiceConnection; //That's the voice channel the bot is talking in#

function joinChannel(msg){
	if(typeof VoiceConnection === 'undefined' || !VoiceConnection ){
		console.log("connecting to channel")
		const userVoiceID = msg.member.voiceChannelID;
		userVoice = msg.guild.channels.get(userVoiceID);
		userVoice.join().then(connection => {
			VoiceConnection = connection;
		});
	}
}

function checkQueue(msg){
	if(!playing && queue.length > 0){
		joinChannel(msg);
		var item = queue.shift();
		setTimeout(function(){
			playFromQueue(msg, item);
		}, 500);
	} else if (!playing && dispatcher){
		disconnect(msg);
	}
}

function addtoQueue(msg,item){
	queue.push(item);
	msg.channel.sendMessage(item["name"] + " was added to queue! Position: " + parseInt(queue.length));
}

function playFromQueue(msg, item){
	if(typeof VoiceConnection !== 'undefined' && VoiceConnection ){
		msg.channel.sendMessage("Now Playing: " + item["name"]);
		if(item["stream"]){
			dispatcher = VoiceConnection.playStream(ytdl(item["value"], { 'filter': "audioonly",'quality':'lowest' }));
		} else {
			dispatcher = VoiceConnection.playFile(item["value"]);
		}
		
		dispatcher.on('end',function(){
			playing = false;
			checkQueue(msg);
		});
		
		dispatcher.on('error',function(err){
			console.log("dispatch error: " + err);
			playing = false;	
			checkQueue(msg);
		});	
		playing = true;
	} else {
		setTimeout(function(){
			playFromQueue(msg, item);
			console.log("retry");
		}, 100);
	}	
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
		disconnect(msg);
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
	if(queue.length > 0){
		var msgString = "Currently in Queue: \n" ;
		var i = 1;
		var item;
		
		queue.forEach(function(item){
			msgString += i + ": " + item["name"] + "\n";
			i+=1;
		});
	} else {
		var msgString = "There aren´t any items in the queue right now." ;
	}
	
	msg.channel.sendMessage(msgString);
}

const nextSong = function(msg){
	dispatcher.end();
}

const flushQueue = function(msg){
	queue = [];
	nextSong(msg);
}

//Disconnect the bot from the voice channel.
const disconnect = function (msg) {
    if (dispatcher) {
        dispatcher.end("Halted by user");
        userVoice.leave();
        dispatcher = null;
		VoiceConnection = null;
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

const commands = {
    debug: debug,
    ping: ping,
    play: play,
	next: nextSong,
	flush: flushQueue,
	queue: infoQueue,
    dc: disconnect,
    die: terminate
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