var _ = require('underscore');
// horrible hack to get localStorage Backbone plugin
var Backbone = (!require('../util').isBrowser()) ? Backbone = require('backbone') : Backbone = window.Backbone;

var Commit = require('../git').Commit;
var Branch = require('../git').Branch;

var Command = require('../models/commandModel').Command;
var CommandEntry = require('../models/commandModel').CommandEntry;
var TIME = require('../util/constants').TIME;

var CommitCollection = Backbone.Collection.extend({
  model: Commit
});

var CommandCollection = Backbone.Collection.extend({
  model: Command
});

var BranchCollection = Backbone.Collection.extend({
  model: Branch
});

var CommandEntryCollection = Backbone.Collection.extend({
  model: CommandEntry,
  localStorage: (Backbone.LocalStorage) ? new Backbone.LocalStorage('CommandEntries') : null
});

var CommandBuffer = Backbone.Model.extend({
  defaults: {
    collection: null
  },

  initialize: function(options) {
    require('../app').getEvents().on('gitCommandReady', _.bind(
      this.addCommand, this
    ));

    options.collection.bind('add', this.addCommand, this);

    this.buffer = [];
    this.timeout = null;
  },

  addCommand: function(command) {
    this.buffer.push(command);
    this.touchBuffer();
  },

  touchBuffer: function() {
    // touch buffer just essentially means we just check if our buffer is being
    // processed. if it's not, we immediately process the first item
    // and then set the timeout.
    if (this.timeout) {
      // timeout existence implies its being processed
      return;
    }
    this.setTimeout();
  },


  setTimeout: function() {
    this.timeout = setTimeout(_.bind(function() {
        this.sipFromBuffer();
    }, this), TIME.betweenCommandsDelay);
  },

  popAndProcess: function() {
    var popped = this.buffer.shift(0);
    var callback = _.bind(function() {
      this.setTimeout();
    }, this);

    // find a command with no error
    while (popped.get('error') && this.buffer.length) {
      popped = this.buffer.pop();
    }
    if (!popped.get('error')) {
      // pass in a callback, so when this command is "done" we will process the next.
      var Main = require('../app');
      Main.getEvents().trigger('processCommand', popped, callback);
    } else {
      // no more commands to process
      this.clear();
    }
  },

  clear: function() {
    clearTimeout(this.timeout);
    this.timeout = null;
  },

  sipFromBuffer: function() {
    if (!this.buffer.length) {
      this.clear();
      return;
    }

    this.popAndProcess();
  }
});

exports.CommitCollection = CommitCollection;
exports.CommandCollection = CommandCollection;
exports.BranchCollection = BranchCollection;
exports.CommandEntryCollection = CommandEntryCollection;
exports.CommandBuffer = CommandBuffer;

