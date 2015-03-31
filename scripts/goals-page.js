var H5P = H5P || {};

/**
 * Goals Page module
 * @external {jQuery} $ H5P.jQuery
 */
H5P.GoalsPage = (function ($) {
  // CSS Classes:
  var MAIN_CONTAINER = 'h5p-goals-page';

  // Goal states
  var GOAL_USER_CREATED = 0;
  var GOAL_PREDEFINED = 1;
  var GOAL_PREDEFINED_SPECIFICATION = 2;

  /**
   * Initialize module.
   * @param {Object} params Behavior settings
   * @param {Number} id Content identification
   * @returns {Object} GoalsPage GoalsPage instance
   */
  function GoalsPage(params, id) {
    this.$ = $(this);
    this.id = id;

    // Set default behavior.
    this.params = $.extend({}, {
      title: 'Goals',
      description: '',
      chooseGoalText: 'Choose goal from list',
      defineGoalText: 'Create a new goal',
      definedGoalLabel: 'User defined goal',
      defineGoalPlaceholder: 'Write here...',
      goalsAddedText: 'goals added',
      finishGoalText: 'Finish',
      editGoalText: 'Edit',
      specifyGoalText: 'Specification',
      removeGoalText: 'Remove',
      grepDialogDone: 'Done',
      filterGoalsPlaceholder: "Filter on words...",
      commaSeparatedCurriculumList: "",
      helpTextLabel: 'Read more',
      helpText: 'Help text'
    }, params);
  }

  /**
   * Attach function called by H5P framework to insert H5P content into page.
   *
   * @param {jQuery} $container The container which will be appended to.
   */
  GoalsPage.prototype.attach = function ($container) {
    var self = this;
    this.$inner = $('<div>', {
      'class': MAIN_CONTAINER
    }).appendTo($container);

    self.goalList = [];
    self.goalId = 0;

    var goalsTemplate =
      '<div class="goals-header">' +
      ' <div role="button" tabindex="1" class="goals-help-text">{{helpTextLabel}}</div>' +
      ' <div class="goals-title">{{title}}</div>' +
      '</div>' +
      '<div class="goals-description">{{description}}</div>' +
      '<div class="goals-define"></div>' +
      '<div class="goals-counter"></div>' +
      '<div class="goals-view"></div>';

    /*global Mustache */
    self.$inner.append(Mustache.render(goalsTemplate, self.params));
    self.$goalsView = $('.goals-view', self.$inner);

    self.createHelpTextButton();
    self.createGoalsButtons();

    // Initialize resize functionality
    self.initResizeFunctionality();
  };

  /**
   * Initialize listener for resize functionality
   */
  GoalsPage.prototype.initResizeFunctionality = function () {
    var self = this;

    // Listen for resize event on window
    $(window).resize(function () {
      self.resize();
    });

    // Initialize responsive view when view is rendered
    setTimeout(function () {
      self.resize();
    }, 0);
  };

  /**
   * Creates buttons for creating user defined and predefined goals
   */
  GoalsPage.prototype.createGoalsButtons = function () {
    var self = this;
    var $goalButtonsContainer = $('.goals-define', self.$inner);

    // Create predefined goal using GREP API
    H5P.JoubelUI.createSimpleRoundedButton(self.params.chooseGoalText)
      .addClass('goals-search')
      .click(function () {
        self.createGrepDialogBox();
      }).appendTo($goalButtonsContainer);

    // Create new goal on click
    H5P.JoubelUI.createSimpleRoundedButton(self.params.defineGoalText)
      .addClass('goals-create')
      .click(function () {
        self.addGoal();
      }).appendTo($goalButtonsContainer);
  };

  /**
   * Adds a new goal to the page
   * @param {Object} competenceAim Optional competence aim which the goal will constructed from
   */
  GoalsPage.prototype.addGoal = function (competenceAim) {
    var self = this;
    var goalText = self.params.defineGoalPlaceholder;
    var goalType = GOAL_USER_CREATED;
    var goalTypeDescription = self.params.definedGoalLabel;

    // Use predefined goal
    if (competenceAim !== undefined) {
      goalText = competenceAim.value;
      goalType = GOAL_PREDEFINED;
      goalTypeDescription = competenceAim.curriculum.value;
    }
    var newGoal = new H5P.GoalsPage.GoalInstance(goalText, self.goalId, goalType, goalTypeDescription);
    self.goalList.push(newGoal);
    self.goalId += 1;

    // Create goal element and append it to view
    self.createGoalElementFromGoalInstance(newGoal).prependTo(self.$goalsView);

    self.updateGoalsCounter();
    self.resize();
  };

  /**
   * Creates goal element from goal instance
   * @param {H5P.GoalsPage.GoalInstance} newGoal Goal instance object to create element from
   * @return {jQuery} $newGoal Goal element
   */
  GoalsPage.prototype.createGoalElementFromGoalInstance = function (newGoal) {
    var $newGoal = this.createNewGoal(newGoal).appendTo(this.$goalsView);
    var $newGoalInput = $('.created-goal', $newGoal);
    $newGoal.removeClass()
      .addClass('created-goal-container')
      .addClass('goal-type-' + newGoal.getGoalInstanceType());

    // Set focus if new user defined goal
    if (newGoal.getGoalInstanceType() === GOAL_USER_CREATED
        || newGoal.getGoalInstanceType() === GOAL_PREDEFINED_SPECIFICATION) {
      $newGoal.addClass('focused');
      //$newGoalInput.text(this.params.defineGoalPlaceholder);
      // Set timeout to prevent input instantly losing focus
      setTimeout(function () {
        $newGoalInput.prop('contenteditable', true);
        $newGoalInput.focus();
      }, 0);
    } else {
      // Truncate goal if it is not receiving focus
      $newGoalInput.addClass('truncate');
    }

    return $newGoal;
  };

  /**
   * Creates a goal specification inside goal container
   * @param {GoalInstance} goalSpecification Goal specification instance
   * @param {jQuery} $parentGoalContainer Parent of goal specification
   * @returns {jQuery} $goalSpecification Goal specification element
   */
  GoalsPage.prototype.createGoalSpecificationElement = function (goalSpecification, $parentGoalContainer) {
    // Creates a goal specification and adds it to goal container
    var $insertionPoint = $('.h5p-created-goal-footer', $parentGoalContainer)
      .not($('.h5p-created-goal-specification .h5p-created-goal-footer', $parentGoalContainer));
    var $goalSpecificationElement = this.createGoalElementFromGoalInstance(goalSpecification)
      .addClass('h5p-created-goal-specification')
      .insertBefore($insertionPoint);
    this.addCustomHoverEffects($goalSpecificationElement);

    return $goalSpecificationElement;
  };

  /**
   * Adds specification to goal
   * @param {H5P.GoalsPage.GoalInstance} goalInstance Specified goal instance
   * @return {GoalInstance} goalInstance Specification of goal instance
   */
  GoalsPage.prototype.addSpecificationToGoal = function (goalInstance) {
    var self = this;

    // Unset answer for goal
    goalInstance.goalAnswer(-1);

    // Add specification
    var goalSpecification = goalInstance.addSpecification(self.params.defineGoalPlaceholder, self.goalId, this.params.specifyGoalText);

    // Add specification to goal list
    self.goalId += 1;
    self.goalList.push(goalSpecification);

    return goalSpecification;
  };

  /**
   * Remove chosen goal from the page
   * @param {jQuery} $goalContainer
   */
  GoalsPage.prototype.removeGoal = function ($goalContainer) {
    var goalInstance = this.getGoalInstanceFromUniqueId($goalContainer.data('uniqueId'));
    // Handle cases where goal container is a specification or a parent
    this.removeSpecification(goalInstance);
    this.removeChildSpecifications(goalInstance);

    if (this.goalList.indexOf(goalInstance) > -1) {
      this.goalList.splice(this.goalList.indexOf(goalInstance), 1);
    }
    $goalContainer.remove();
    this.updateGoalsCounter();
  };

  /**
   * Remove goal specification from parent goal
   * @param {H5P.GoalsPage.GoalInstance} goalInstance Specification goal instance
   */
  GoalsPage.prototype.removeSpecification = function (goalInstance) {
    // Only handle cases where goal instance is a specification
    if (goalInstance.getGoalInstanceType() === GOAL_PREDEFINED_SPECIFICATION) {
      // Find parent and remove specification from it
      var goalParent = goalInstance.getParent();
      goalParent.removeSpecification(goalInstance);
      if (!goalParent.getSpecifications().length) {
        var $goalElement = this.getGoalElementFromGoalInstance(goalParent);
        $goalElement.removeClass('has-specification');
      }
    }
  };

  /**
   * Remove all specifications linked to this goal
   * @param {H5P.GoalsPage.GoalInstance} goalInstance Parent goal instance
   */
  GoalsPage.prototype.removeChildSpecifications = function (goalInstance) {
    var self = this;
    if (goalInstance.getGoalInstanceType() === GOAL_PREDEFINED) {
      // Remove children from goal list
      var specificationChildren = goalInstance.getSpecifications();
      if (specificationChildren !== undefined && specificationChildren.length) {
        specificationChildren.forEach(function (goalSpecificationInstance) {
          // Remove specification if it is in goal list
          var removeSpecificationIndex = -1;
          self.goalList.forEach(function (goalListEntry, goalListEntryIndex) {
            if (goalListEntry.getUniqueId() === goalSpecificationInstance.getUniqueId()) {
              removeSpecificationIndex = goalListEntryIndex;
            }
          });
          if (removeSpecificationIndex > -1) {
            self.goalList.splice(removeSpecificationIndex, 1);
          }
        });
      }
    }
  };

  /**
   * Updates goal counter on page with amount of chosen goals.
   */
  GoalsPage.prototype.updateGoalsCounter = function () {
    var self = this;
    var $goalCounterContainer = $('.goals-counter', self.$inner);
    $goalCounterContainer.children().remove();
    if (self.goalList.length) {
      $('<span>', {
        'class': 'goals-counter-text',
        'html': self.goalList.length + ' ' + self.params.goalsAddedText
      }).appendTo($goalCounterContainer);
    }
  };

  /**
   * Returns the goal instance matching provided id
   * @param {Number} goalInstanceUniqueId Id matching unique id of target goal
   * @returns {H5P.GoalsPage.GoalInstance|Number} Returns matching goal instance or -1 if not found
   */
  GoalsPage.prototype.getGoalInstanceFromUniqueId = function (goalInstanceUniqueId) {
    var foundInstance = -1;
    this.goalList.forEach(function (goalInstance) {
      if (goalInstance.getUniqueId() === goalInstanceUniqueId) {
        foundInstance = goalInstance;
      }
    });

    return foundInstance;
  };

  /**
   * Get goal element from goal instance
   * @return {jQuery|Number} Return goal element or -1 if not found
   */
  GoalsPage.prototype.getGoalElementFromGoalInstance = function (goalInstance) {
    var $goalElement = -1;
    this.$goalsView.children().each(function () {
      if ($(this).data('uniqueId') === goalInstance.getUniqueId()) {
        $goalElement = $(this);
      }
    });

    return $goalElement;
  };

  /**
   * Create help text functionality for reading more about the task
   */
  GoalsPage.prototype.createHelpTextButton = function () {
    var self = this;

    if (this.params.helpText !== undefined && this.params.helpText.length) {

      // Create help button
      $('.goals-help-text', this.$inner).click(function () {
        var $helpTextDialog = new H5P.JoubelUI.createHelpTextDialog(self.params.title, self.params.helpText);
        $helpTextDialog.appendTo(self.$inner.parent().parent().parent());
      }).keydown(function (e) {
        var keyPressed = e.which;
        // 32 - space
        if (keyPressed === 32) {
          $(this).click();
          e.preventDefault();
        }
        $(this).focus();
      });

    } else {
      $('.goals-help-text', this.$inner).remove();
    }
  };

  /**
   * Get lists with filtered ids
   * @returns {Array} filterIdList
   */
  GoalsPage.prototype.getFilteredIdList = function () {
    var filterIdList = [];
    if (this.params.commaSeparatedCurriculumList !== undefined
        && this.params.commaSeparatedCurriculumList.length) {
      filterIdList = this.params.commaSeparatedCurriculumList.split(',');
      filterIdList.forEach(function (filterId, filterIndex) {
        filterIdList[filterIndex] = filterId.trim();
      });
    }
    return filterIdList;
  };

  /**
   * Create grep dialog box
   */
  GoalsPage.prototype.createGrepDialogBox = function () {
    var self = this;
    var filteredIdList = self.getFilteredIdList();
    var dialogInstance = new H5P.GoalsPage.GrepDialogBox(this.params, filteredIdList);
    dialogInstance.attach(self.$inner.parent().parent().parent());
    dialogInstance.getFinishedButton().on('dialogFinished', function (event, data) {
      data.forEach(function (competenceAim) {
        self.addGoal(competenceAim);
      });
    });
  };

  /**
   * Create a new goal container
   * @param {H5P.GoalsPage.GoalInstance} goalInstance Goal instance object to create the goal from
   * @returns {jQuery} $goalContainer New goal element
   */
  GoalsPage.prototype.createNewGoal = function (goalInstance) {
    var self = this;

    // Goal container
    var $goalContainer = $('<div/>', {
      'class': 'created-goal-container'
    }).data('uniqueId', goalInstance.getUniqueId());

    var initialText = goalInstance.goalText();

    // Input paragraph area
    $('<div>', {
      'class': 'created-goal',
      'spellcheck': 'false',
      'contenteditable': false,
      'text': initialText
    }).appendTo($goalContainer);

    self.createGoalContainerFooter($goalContainer, goalInstance)
      .appendTo($goalContainer);

    self.addCustomHoverEffects($goalContainer);

    return $goalContainer;
  };


  GoalsPage.prototype.createGoalContainerFooter = function ($goalContainer, goalInstance) {
    // Custom input footer
    var $goalContainerFooter = $('<div>', {
      'class': 'h5p-created-goal-footer'
    });
    var $goalInputArea = $('.created-goal', $goalContainer);

    // Create buttons when editing
    var $inputFooter = $('<div>', {
      'class': 'h5p-created-goal-input-footer'
    }).appendTo($goalContainerFooter);
    this.createRemoveGoalButton(this.params.removeGoalText, $goalContainer).appendTo($inputFooter);
    this.createFinishedGoalButton(this.params.finishGoalText, $goalContainer).appendTo($inputFooter);

    // Create footer when hovering
    var $hoverFooter = $('<div>', {
      'class': 'h5p-created-goal-hover-footer'
    }).appendTo($goalContainerFooter);

    $('<div>', {
      'class': 'footer-description',
      'html': goalInstance.getGoalTypeDescription()
    }).appendTo($hoverFooter);

    if (goalInstance !== undefined && goalInstance.getGoalInstanceType() === GOAL_PREDEFINED) {
      this.createRemoveGoalButton(this.params.removeGoalText, $goalContainer).appendTo($hoverFooter);
      this.createSpecifyGoalButton(this.params.specifyGoalText, $goalContainer).appendTo($hoverFooter);
    } else {
      this.createRemoveGoalButton(this.params.removeGoalText, $goalContainer).appendTo($hoverFooter);
      this.createEditGoalButton(this.params.editGoalText, $goalInputArea).appendTo($hoverFooter);
    }

    return $goalContainerFooter;
  };

  /**
   * Adds custom hover effects to goal container
   * @param {jQuery} $goalContainer Element that will get custom hover effects
   */
  GoalsPage.prototype.addCustomHoverEffects = function ($goalContainer) {
    var self = this;
    var $goalInputArea = $('.created-goal', $goalContainer);

    // Add custom footer tools when input area is focused
    $goalInputArea.focus(function () {
      //Remove placeholder
      if ($(this).text() === self.params.defineGoalPlaceholder) {
        $(this).text('');
      }

      setTimeout(function () {
        // Set focused on parent if this is a child
        if ($goalContainer.hasClass('h5p-created-goal-specification')) {
          $goalContainer.parent().addClass('child-focused');
        }
        $(this).removeClass('truncate');
        $goalContainer.addClass('focused');
      }, 150);
    }).focusout(function () {
      // Delay focus out function slightly in case goal is removed
      setTimeout(function () {
        $goalInputArea.addClass('truncate');
        $goalContainer.removeClass('focused');
        // Remove focused on parent if this is a child
        if ($goalContainer.hasClass('h5p-created-goal-specification')) {
          $goalContainer.parent().removeClass('child-focused');
        }
        $goalInputArea.prop('contenteditable', false);
      }, 150);

      // Set standard text if textfield is empty
      if ($(this).text() === '') {
        $(this).text(self.params.defineGoalPlaceholder);
      }

      self.getGoalInstanceFromUniqueId($goalContainer.data('uniqueId'))
        .goalText($(this).text());
    });

    // Add custom hover effects for the goal container
    $goalContainer.mouseenter(function () {
      $goalInputArea.removeClass('truncate');
    }).mouseleave(function () {
      if (!$goalInputArea.is(':focus')) {
        $goalInputArea.addClass('truncate');
      }
    });
  };

  /**
   * Creates a button for enabling editing the given goal
   * @param {String} text String to display on the button
   * @param {jQuery} $inputGoal Input area for goal
   * @returns {jQuery} $editGoalButton The button
   */
  GoalsPage.prototype.createEditGoalButton = function (text, $inputGoal) {
    var $editGoalButton = $('<div>', {
      'class': 'h5p-created-goal-edit',
      'role': 'button',
      'tabindex': 1,
      'title': text
    }).click(function () {
      //Make goal editable and set focus to it
      $inputGoal.prop('contenteditable', true);
      $inputGoal.focus();
    });

    $('<span>', {
      'text': text,
      'class': 'h5p-created-goal-edit-text'
    }).appendTo($editGoalButton);

    return $editGoalButton;
  };

  /**
   * Creates a button for creating a specification of the given goal
   * @param {String} text String to display on the button
   * @param {jQuery} $goalContainer Goal container element the new specification will be added to
   * @returns {jQuery} $specifyGoalButton The button
   */
  GoalsPage.prototype.createSpecifyGoalButton = function (text, $goalContainer) {
    var self = this;
    var $specifyGoalButton = $('<div>', {
      'class': 'h5p-created-goal-specify',
      'role': 'button',
      'tabindex': 1,
      'title': text
    }).click(function () {
      //Make a goal specification and set focus to it
      var goalInstance = self.getGoalInstanceFromUniqueId($goalContainer.data('uniqueId'));
      var goalSpecification = self.addSpecificationToGoal(goalInstance);
      self.createGoalSpecificationElement(goalSpecification, $goalContainer);
      $goalContainer.addClass('has-specification');
    });

    $('<span>', {
      'text': text,
      'class': 'h5p-created-goal-specify-text'
    }).appendTo($specifyGoalButton);

    return $specifyGoalButton;
  };

  /**
   * Creates a button for enabling editing the given goal
   * @param {String} text String to display on the button
   * @param {jQuery} $goalContainer Goal container element
   * @returns {jQuery} $editGoalButton The button
   */
  GoalsPage.prototype.createFinishedGoalButton = function (text, $goalContainer) {
    var $finishedGoalButton = $('<div>', {
      'class': 'h5p-created-goal-done',
      'role': 'button',
      'tabindex': 1,
      'title': text
    }).click(function () {
      $('.created-goal', $goalContainer).prop('contenteditable', false);
    });

    $('<span>', {
      'text': text,
      'class': 'h5p-created-goal-done-text'
    }).appendTo($finishedGoalButton);

    return $finishedGoalButton;
  };

  /**
   * Creates a button for removing the given container
   * @param {String} text String to display on the button
   * @param {jQuery} $removeContainer Container that will be removed upon click
   * @returns {jQuery} $removeGoalButton The button
   */
  GoalsPage.prototype.createRemoveGoalButton = function (text, $removeContainer) {
    var self = this;
    var $removeGoalButton = $('<div>', {
      'class': 'h5p-created-goal-remove',
      'role': 'button',
      'tabindex': 1,
      'title': text
    }).click(function () {
      self.removeGoal($removeContainer);
    });

    $('<span>', {
      'text': text,
      'class': 'h5p-created-goal-remove-text'
    }).appendTo($removeGoalButton);

    return $removeGoalButton;
  };

  /**
   * Get page title
   * @returns {String} Page title
   */
  GoalsPage.prototype.getTitle = function () {
    return this.params.title;
  };

  /**
   * Get goal list
   * @returns {Array} Goal list
   */
  GoalsPage.prototype.getGoals = function () {
    return this.goalList;
  };

  /**
   * Responsive resize of goals view
   */
  GoalsPage.prototype.resize = function () {
    var staticNoFooterThreshold = 33;
    var staticNoLabelsThreshold = 20;
    var widthInEm = this.$goalsView.width() / parseInt(this.$inner.css('font-size'), 10);

    // Remove footer description
    if (widthInEm < staticNoFooterThreshold) {
      this.$goalsView.addClass('no-footer-description');
    } else {
      this.$goalsView.removeClass('no-footer-description');
    }

    // Remove button labels
    if (widthInEm < staticNoLabelsThreshold) {
      this.$goalsView.addClass('no-footer-labels');
    } else {
      this.$goalsView.removeClass('no-footer-labels');
    }
  };

  return GoalsPage;
}(H5P.jQuery));
