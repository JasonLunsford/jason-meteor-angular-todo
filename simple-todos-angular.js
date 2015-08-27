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

    // bootstrap Angular manually to accommodate different ready events understood
    // by different devices
    if (Meteor.isCordova)
      angular.element(document).on('deviceready', onReady);
    else
      angular.element(document).ready(onReady);

    angular.module('simple-todos').controller('TodosListCtrl', ['$scope', '$meteor',
      function ($scope, $meteor) {

        // Straight call to collection to get contents of Tasks db, no db sorting
        // only possible when meteor autopublish package installed
        // $scope.tasks = $meteor.collection(Tasks);

        // client subscribes to available server publications via this method
        $scope.$meteorSubscribe('tasks');

        $scope.tasks = $meteor.collection( function() {
          // sorts the newest tasks to the top
          // return Tasks.find({}, { sort: { createdAt: -1 } });

          // returns only not completed todo list itesm
          // return Tasks.find({ checked: {$ne: true} }, { sort: { createdAt: -1 } });

          // Meteor will not know Angular $scope.query parameter changed - boo
          // return Tasks.find($scope.query, {sort: {createdAt: -1}});

          return Tasks.find($scope.getReactively('query'), {sort: {createdAt: -1}});
        });

        $scope.addTask = function (newTask) {
          // call Meteor method, direct DB manipulation a no-no
          $meteor.call('addTask', newTask);
        };

        $scope.deleteTask = function (task) {
          $meteor.call('deleteTask', task._id);
        };

        $scope.setChecked = function (task) {
          $meteor.call('setChecked', task._id, !task.checked);
        };

        $scope.setPrivate = function (task) {
          /*
            note call accepts 1+n parameters:
            $meteor.call('nameOfMeteorMethod', param1, param2)
          */
          $meteor.call('setPrivate', task._id, !task.private);
        };

        $scope.$watch('hideCompleted', function () {
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
  // returns documents in task collection
  Meteor.publish('tasks', function() {
    return Tasks.find({
      $or: [
        { private: {$ne: true} },
        { owner: this.userId }
      ]
    });
  });
}

// Separation of database logic from event handlers / general client side code good for the soul
// also, these methods are meant for client & server to support optimistic UI
Meteor.methods({
    addTask: function (text) {
      // Make sure user is logged on
      if (!Meteor.userId()) {
        throw new Meteor.Error('not-authorized');
      }

      Tasks.insert({
        text: text,
        createdAt: new Date(),
        owner: Meteor.userId(),
        username: Meteor.user().username
      });
    },
    deleteTask: function (taskId) {
      var task = Tasks.findOne(taskId);

      // Check if task configured as private and if current user matches task owner
      if (task.private && task.owner !== Meteor.userId()) {
        // no match, throw error
        throw new Meteor.Error('not-authorized');
      }

      // Only task owners allowed to delete their todo items
      if (task.owner !== Meteor.userId()) {
        throw new Meteor.Error('not-authorized');
      }

      Tasks.remove(taskId);
    },
    setChecked: function (taskId, setChecked) {
      var task = Tasks.findOne(taskId);

      // Only owner allowed to check off tasks flagged as private
      if (task.private && task.owner !== Meteor.user()) {
        throw new Meteor.Error('not-authorized');
      }

      Tasks.update(taskId, { $set: { checked: setChecked} });
    },
    setPrivate: function (taskId, setToPrivate) {
      var task = Tasks.findOne(taskId);

      // Ensure only task owner can make task private
      if (task.owner !== Meteor.userId()) {
        throw new Meteor.Error('not-authorized');
      }

      Tasks.update(taskId, { $set: { private: setToPrivate } });
    }
});