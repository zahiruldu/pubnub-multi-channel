'use strict';

angular
  .module('app', [ 'pubnub.angular.service', 'ngNotify'])
  .factory('MessageService', ['$rootScope', '$q', 'Pubnub','currentUser', 'ngNotify',
 function MessageServiceFactory($rootScope, $q, Pubnub, currentUser, ngNotify) {
  
  // Aliasing this by self so we can access to this trough self in the inner functions
  var self = this;
  this.messages = [];
  this.channel = '';

// Channel Broadcasting starts
  var sharedService = {};

    sharedService.channel = '';

    sharedService.configBroadcast = function(channel) {
        this.channel = channel;
        this.channelBroadcast();
    };

    sharedService.channelBroadcast = function() {
        $rootScope.$broadcast('getChannelBroadcast');
    };
    // Channel broadcasting ends


  // We keep track of the timetoken of the first message of the array
  // so it will be easier to fetch the previous messages later
  this.firstMessageTimeToken = null;
  this.messagesAllFetched = false;

  var whenDisconnected = function(){
      ngNotify.set('Connection lost. Trying to reconnect...', {
        type: 'warn',
        sticky: true,
        button: false,
      });
  };

  var whenReconnected = function(){
      ngNotify.set('Connection re-established.', {
          type: 'info',
          duration: 1500
      });
  };

  var init = function(channelId) {
      
      Pubnub.subscribe({
          channel: channelId,
          disconnect : whenDisconnected, 
          reconnect : whenReconnected,
          triggerEvents: ['callback']
      });

      Pubnub.time(function(time){
        self.firstMessageTimeToken = time;
      })

      subcribeNewMessage(channelId,function(ngEvent,m){
        self.messages.push(m)
        $rootScope.$digest()
  });

  };

  var populate = function(channelId){

    var defaultMessagesNumber = 20;

    Pubnub.history({
     channel: channelId,
     callback: function(m){
        // Update the timetoken of the first message
        self.timeTokenFirstMessage = m[1]
        angular.extend(self.messages, m[0]);  
        
        if(m[0].length < defaultMessagesNumber){
          self.messagesAllFetched = true;
        }

        $rootScope.$digest()
        $rootScope.$emit('factory:message:populated')
        
     },
     count: defaultMessagesNumber, 
     reverse: false
    });

  };

  ////////////////// PUBLIC API ////////////////////////

  var subcribeNewMessage = function(channelId,callback){
    $rootScope.$on(Pubnub.getMessageEventNameFor(channelId), callback);
  };


  var fetchPreviousMessages = function(channelId){

    var defaultMessagesNumber = 10;

    var deferred = $q.defer()

    Pubnub.history({
     channel: channelId,
     callback: function(m){
        // Update the timetoken of the first message
        self.timeTokenFirstMessage = m[1]
        Array.prototype.unshift.apply(self.messages,m[0])
        
        if(m[0].length < defaultMessagesNumber){
          self.messagesAllFetched = true;
        }

        $rootScope.$digest()
        deferred.resolve(m)

     },
     error: function(m){
        deferred.reject(m)
     },
     count: defaultMessagesNumber, 
     start: self.timeTokenFirstMessage,
     reverse: false
    });

    return deferred.promise
  };


  var getMessages = function(channelId) {

    if (_.isEmpty(self.messages))
      populate(channelId);

    return self.messages;

  };

  var messagesAllFetched = function() {

    return self.messagesAllFetched;

  };

  var sendMessage = function(channelId,messageContent) {

      // Don't send an empty message 
      if (_.isEmpty(messageContent))
          return;

      Pubnub.publish({
          channel: channelId,
          message: {
              uuid: (Date.now() + currentUser),
              content: messageContent,
              sender_uuid: currentUser,
              date: Date.now()
          },
      });
  };

  // Chaning channels  based on broadcast
   $rootScope.$on('getChannelBroadcast', function() {
        self.channel = sharedService.channel;
        init(self.channel);

         self.messages = [];
        console.log('new chnanel in service'+self.channel);


    });
  // init(self.channel);

  // The public API interface
  return {
    sharedService:sharedService,
    getMessages: getMessages, 
    sendMessage: sendMessage,
    subscribeNewMessage: subcribeNewMessage,
    fetchPreviousMessages: fetchPreviousMessages,
    messagesAllFetched : messagesAllFetched
  } 

}]);
