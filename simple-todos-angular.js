Tasks = new Mongo.Collection('tasks');

// moved this function out of the If block
function onReady() {
    angular.bootstrap(document, ['simple-todos']);
}

// Client only code
if (Meteor.isClient) {

    Accounts.ui.config({
      passwordSignupFields: "USERNAME_ONLY"
    });

    angular.module('simple-todos', ['angular-meteor']);

    if (Meteor.isCordova)
      angular.element(document).on('deviceready', onReady);
    else
      angular.element(document).ready(onReady);

    angular.module('simple-todos').controller('TodosListCtrl', ['$scope', '$meteor',
      function ($scope, $meteor) {

        // Straight call to collection to get contents of Tasks db, no db sorting
        // $scope.tasks = $meteor.collection(Tasks);

        $scope.tasks = $meteor.collection( function() {
          // sorts the newest tasks to the top
          // return Tasks.find({}, { sort: { createdAt: -1 } });

          // returns only not completed todo list itesm
          // return Tasks.find({ checked: {$ne: true} }, { sort: { createdAt: -1 } });

          // Meteor will not know Angular $scope.query parameter changed - boo
          // return Tasks.find($scope.query, {sort: {createdAt: -1}});

          return Tasks.find($scope.getReactively('query'), {sort: {createdAt: -1}});
        });

        $scope.addTask = function(newTask) {
          $scope.tasks.push(
            {
              text: newTask,
              createdAt: new Date(),
              owner: Meteor.userId(),
              username: Meteor.user().username
            }
          );
        };

        $scope.$watch('hideCompleted', function() {
          if ($scope.hideCompleted)
            $scope.query = {checked: {$ne: true}};
          else
            $scope.query = {};
        });

        $scope.incompleteCount = function() {
          return Tasks.find({ checked: {$ne: true} }).count();
        };

    }]);
}

// Server only code
if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
