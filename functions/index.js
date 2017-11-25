"use strict";

const Alexa = require('alexa-sdk');
const requestApi = require('request');
const moment = require('moment-timezone');

exports.handler = function(event, context, callback) {
  moment.tz.setDefault("Asia/Tokyo");
  var alexa = Alexa.handler(event, context);
  alexa.appId = process.env.APP_ID;
  alexa.registerHandlers(handlers);
  alexa.execute();
};

var handlers = {
  'LaunchRequest': function () {
    console.log("LaunchRequest");
  　this.emit(':ask', 'どのステージ情報が知りたいですか？');
  },
  'AMAZON.HelpIntent': function () {
    console.log("HelpIntent");
    this.emit(':ask', '例えば、「今のガチマッチを教えて」と言ってみてください。');
  },
  'AMAZON.StopIntent': function () {
    console.log("StopIntent");
    this.emit(':tell', 'イカステージを終了します。まんめんみ');
  },
  'SessionEndedRequest': function () {
    console.log("SessionEndedRequest");
    this.emit(':tell', 'エラーが発生したため、イカステージを終了します。まんめんみ');
  },
  'searchStage': function () {
    console.log("searchStage");
    var match = this.event.request.intent.slots.match.value;
    var when = this.event.request.intent.slots.when.value;
    requestSearch(this, match, when);
  }
};

function requestSearch(alexa, matchArg, whenArg) {
  var match;
  switch (matchArg){
    case 'レギュラーマッチ':
    case 'ナワバリバトル':
      match = "regular";
      break;
    case 'ガチマッチ':
      match = "gachi";
      break;
    case 'リーグマッチ':
      match = "league";
      break;
    default:
      alexa.emit(':tell', 'マッチ情報が指定されていません');
      return;
  }
  var when;
  switch (whenArg){
    case '次':
      when = 'next';
      break;
    case '今':
    default:
      when = 'now';
      whenArg = '現在';
      break;
  }
  var options = {
    url: "https://spla2.yuu26.com/" + match + "/" + when,
    method: 'GET',
  };
  function callback(error, response, body) {
    console.log('body     : ' + body);
    console.log('response : ' + response);
    console.log('error    : ' + error);
    if (!error && response.statusCode == 200) {
      var result = JSON.parse(body);
      if (result.result[0].maps_ex.length <= 0) {
        alexa.emit(':tell', 'ステージ情報がありませんでした');
        return;
      }
      var rule = result.result[0].rule;
      switch (matchArg) {
        case 'レギュラーマッチ':
        case 'ナワバリバトル':
          rule = result.result[0].rule;
          break;
        case 'ガチマッチ':
        case 'リーグマッチ':
          rule = matchArg + "(" + result.result[0].rule + ")";
          break;
        default:
          alexa.emit(':tell', 'マッチ情報が指定されていません');
          return;
      }
      var stage = ""
      for (var i = 0; i < result.result[0].maps_ex.length; i++) {
        if (stage.length > 0) {
          stage += "と";
        }
        stage += result.result[0].maps_ex[i].name;
      }
      var endDateString = moment.unix(result.result[0].end_t).format("HH時mm分");
      if (when == 'next') {
        var startDateString = moment.unix(result.result[0].start_t).format("HH時mm分");
        alexa.emit(':tell', whenArg + "の" + rule + "のステージは" + stage + "です。開催時刻は" + startDateString + "から" + endDateString + "までです。");
      } else {
        var endDate = moment.unix(result.result[0].end_t);
        var limitString = endDate.diff(moment().format(), 'minutes');
        alexa.emit(':tell', whenArg + "の" + rule + "のステージは" + stage + "です。終了時刻の" + endDateString + "まではあと" + limitString + "分です。");
      }
    } else {
      alexa.emit(':tell', 'エラーが発生しました');
    }
  }
  requestApi(options, callback);
}
