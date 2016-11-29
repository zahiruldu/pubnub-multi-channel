  angular
  .module('app')
  .run(['Pubnub','currentUser', function(Pubnub, currentUser) {

    Pubnub.init({
          publish_key: 'pub-c-830c2907-15e4-4920-957b-6abf3fde3384',
          subscribe_key: 'sub-c-796e5a30-7d5a-11e6-a627-0619f8945a4f',
          uuid: currentUser,
          origin: 'pubsub.pubnub.com',
          ssl: true
      });

  }])
  .run(['ngNotify', function(ngNotify) {

      ngNotify.config({
          theme: 'paster',
          position: 'top',
          duration: 250
      });

  }])

  .value('currentUser', _.random(1000000).toString())


  .directive('messageList', function($rootScope, $anchorScroll, MessageService, ngNotify) {
  return {
    restrict: "E",
    replace: true,
    templateUrl: 'components/message-list/message-list.html',

    link: function(scope, element, attrs, ctrl) {

      var element = angular.element(element)

      var scrollToBottom = function() {
          element.scrollTop(element.prop('scrollHeight'));
      };

      var hasScrollReachedBottom = function(){
        return element.scrollTop() + element.innerHeight() >= element.prop('scrollHeight')
      };

      var hasScrollReachedTop = function(){
        return element.scrollTop() === 0 ;
      };

      var fetchPreviousMessages = function(channelId){

        ngNotify.set('Loading previous messages...','success');

        var currentMessage = MessageService.getMessages(channelId)[0].uuid

        MessageService.fetchPreviousMessages(channelId).then(function(m){

          // Scroll to the previous message 
          $anchorScroll(currentMessage);

        });

      };

      var channelId = '';
      scope.$on('getChannelBroadcast', function() {
        channelId = MessageService.sharedService.channel;
        init(channelId);
        console.log('newchannel in list'+channelId);
        
      });

      var watchScroll = function() {

        if(hasScrollReachedTop()){

          if(MessageService.messagesAllFetched()){
            ngNotify.set('All the messages have been loaded', 'grimace');
          }
          else {
            fetchPreviousMessages(channelId);
          }
        }

        // Update the autoScrollDown value 
        scope.autoScrollDown = hasScrollReachedBottom()

      };

      var init = function(channelId){
          
          // Scroll down when the list is populated
          var unregister = $rootScope.$on('factory:message:populated', function(){ 
            // Defer the call of scrollToBottom is useful to ensure the DOM elements have been loaded
            _.defer(scrollToBottom);
            unregister();

          });

          // Scroll down when new message
          MessageService.subscribeNewMessage(channelId,function(){
            if(scope.autoScrollDown){
              scrollToBottom()
            }
          });

          // Watch the scroll and trigger actions
          element.bind("scroll", _.debounce(watchScroll,250));
      };

      // init(channelId);

    },
    controller: function($scope){
      // Auto scroll down is acticated when first loaded
      $scope.autoScrollDown = true;

      var channelId = '';

      $scope.$on('getChannelBroadcast', function() {
        channelId = MessageService.sharedService.channel;
        $scope.messages = MessageService.getMessages(channelId);
        
      });
      
      // $scope.messages = MessageService.getMessages(this.channel);
    }
  };
})


.directive('messageForm', function() {
  return {
    restrict: "E",
    replace: true,
    templateUrl: 'components/message-form/message-form.html',
    scope: {},
    
    controller: function($scope, currentUser, MessageService){

      $scope.uuid = currentUser;
      $scope.messageContent = '';

       var channelId = 'messages-channel6';

      $scope.$on('getChannelBroadcast', function() {
        channelId = MessageService.sharedService.channel;
        
      });

      $scope.sendMessage = function(){
        MessageService.sendMessage(channelId,$scope.messageContent);
        $scope.messageContent = '';
      }

      $scope.changeChannel = function(channel){
        MessageService.sharedService.configBroadcast(channel);

      };
    //   $scope.$on('getChannelBroadcast', function() {
    //     self.channel = MessageService.sharedService.channel;
    //     console.log('new chnanel'+self.channel);


    // });

    }
  };
})

.directive('userAvatar', function() {
  return {
    restrict: "E",
    template: '<img src="{{avatarUrl}}" alt="{{uuid}}" class="circle">',
    scope: {
      uuid: "@",
    },
    controller: function($scope){
      // Generating a uniq avatar for the given uniq string provided using robohash.org service
      $scope.avatarUrl = '//robohash.org/' + $scope.uuid + '?set=set2&bgset=bg2&size=70x70';
    }
  };
});