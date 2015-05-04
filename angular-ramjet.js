/**
  Angular-RamJet
  Author: BoleroDan
  Description: provides morphing using the RamJet.js script by Rich Harris between
  two elements
**/
(function(){
	'use strict'
	angular.module('wally.directives.ramjet',[])
		.factory('_ramjet',ramJetFactory)
		.controller('ramjetController',ramjetController)
		.directive('ramjetItem',ramjetItem)
		.directive('ramjetMorph',ramjetMorph)
		.directive('ramjetToggle',ramjetToggle);


/**
	Convenience factory
	to wrap around the RamJet Library.
	Just to provide an error if they forget to
	include ramjet or before this script
**/
function ramJetFactory(){

	if(window.ramjet){
		return ramjet
	}else{
		throw new Error("The RamJet.js library is not installed. Please include that requriement before this script")
	}
}


/**
	The Toggle element for this directive. Place only
	one root element inside this directive. That will
	be used as the "click" function to toggle your morph"
	Attribute Options:
		hide-on-toggle: Boolean (Default True)
	Example Usage:
		<ramjet-toggle>
			<button>Click Me!</button>
		</ramjet-toggle>
**/
function ramjetToggle(){
    return {
    restrict:'AE',
    require:'^ramjetItem',
    link: link,
    templateUrl: 'ramjet_toggle.html',
    transclude:true,
    replace:true
  }
  
  function link(scope,element,attrs,ctrl){

  	ctrl.registerRamjetToggle(element,attrs.hideOnToggle)
	
     element.bind('click', clickHandler);  
     scope.$on('$destroy',cleanUp)

    function clickHandler(event){
      event.stopPropagation();
      scope.$apply(function()
      {
          ctrl.toggle();
      });    	
    }

    function cleanUp(){
    	element.unbind('click',clickHandler)
    }  
  }
}


/**
	The item that we will be morphing the toggle directive
	into. Place only one root element as well

	Attribute Options:
		click-to-close: Boolean (Default True)

	Example Usage:
		<ramjet-morph>
			<div class="my-modal-window">
				Hi there!
			</div>
		</ramjet-morph>
**/
function ramjetMorph(){
  
  return {
    restrict:'E',
    require:'^ramjetItem',
    link: link,
    templateUrl: 'ramjet_morph.html',
    transclude:true,
    replace:true
  } 
  
  function link(scope,element,attrs,ctrl){
    
  	scope.clickToClose = scope.$eval(attrs.clickToClose || "true");
    ctrl.registerMorphElement(element);

    /**
    	Whether we want to allow the morphed element
    	to be clicked on to close it, handy for gallery photos
	**/
    if (scope.clickToClose){
	    element.on('click',clickHandler);
	    scope.$on('$destroy',cleanUp)
	}

    function clickHandler(event){
      event.stopPropagation();
      scope.$apply(function(){
        ctrl.toggle();
      });
    }	

    function cleanUp(){
    	element.unbind('click',clickHandler)
    }      
  }
}

/**
	The main "Parent" directive. This is the
	container that holds it's children directives.

	Attribute Options:
		toBody: Boolean (Default false)

	Example Usage:
	<ramjet-item>
		<ramjet-toggle>
			<button>Click Me!</button>
		</ramjet-toggle>
		<ramjet-morph>
			<div class="my-modal-window">
				Hi there!
			</div>
		</ramjet-morp
	</ramjet-item>
**/		
function ramjetItem(){
  return {
    restrict:'E',
    controller:'ramjetController',  
    controllerAs:'vm',
    bindToController:true,
    link: link,
    templateUrl: 'ramjet.html', 
    transclude:true,
    replace:true,
    scope:true
  }
  
  function link(scope,element,attrs,ctrl){
    ctrl.registerRamjetContainer(element,attrs.toBody);
  }
  
  
}

ramjetController.$inject = ['$scope','$timeout','$window','_ramjet']
function ramjetController($scope,$timeout,$window,_ramjet){  
  /**
  	cache our elements
  **/
  var ramjetContainerEl,ramjetMorphEl,ramjetToggleEl;
  var body = document.body;
  var vm = this;
  /**
  	public functions
  **/
  vm.registerRamjetContainer = registerRamjetContainer;
  vm.registerRamjetToggle = registerRamjetToggle;
  vm.registerMorphElement = registerMorphElement;
  vm.toggle = toggle;


  /**
  	Public variables
  **/
  vm.isOpen = false;  //triggers ngIf
  vm.toBody = false;	//append to body?
  vm.transitioning = false;  //are we animating?
  vm.hideToggle = false; //When we click on our toggle element, should we hide it?


  function toggle(){
    if(vm.transitioning){
      //stop from triggering from fast clicks
      return; 
    }
    if(!vm.isOpen){
      //we're not open so transition to our morph element
      if(vm.hideToggle){
      	ramjet.hide(ramjetToggleEl[0]) //hide the toggle element
      }

  	  /**
  		remove from directive container, put it in the body element.
  		Why? Incase you want a pop up to be absolutely positioned to the body.
  	  **/
      if(vm.toBody){
      	_unlinkMorph();    	
      }
      _ramjet.hide(ramjetMorphEl[0])
      vm.isOpen = true; //display the ngIf element inside the morph element      
      $timeout(function(){
        var morphContent = ramjetMorphEl[0].querySelector('.ramjet-morph__content').children[0]
        _ramjet.hide(morphContent)
        _ramjet.show(ramjetMorphEl[0])
        _ramjet.transform(ramjetToggleEl[0],morphContent,{
          easing: ramjet.easeOut,
          done:function(){
            _ramjet.show(morphContent)
            vm.transitioning = false;
          }
        })
        vm.transitioning = true;
      })
    }else{
      //we're closing
      var morphContent = ramjetMorphEl[0].querySelector('.ramjet-morph__content').children[0]
      if(vm.hideToggle){
      	_ramjet.hide(ramjetToggleEl[0]) //hide the toggle element      
      }
      _ramjet.hide(morphContent)

      _ramjet.transform(morphContent,ramjetToggleEl[0],{
        easing: ramjet.easeOut,
        done:function(){
        	if(vm.hideToggle){
        		_ramjet.show(ramjetToggleEl[0]) //show toggle element again        		
        	}
			$scope.$apply(function(){
				vm.isOpen = false; //hide content for the ng-if
			})
			/**
				Keep things clean, so if append to body
				we want to remove it and place it back into the
				directive container on animation finish
			**/
			if(vm.toBody){

				_linkMorph(); //link morph element back into ramjet container
			}
			vm.transitioning = false;
        }
      });

      vm.transitioning = true;
    }
  	
  }

  /**
  	Move the ramjetMorph
  	element to the body
	**/
  function _unlinkMorph(){
  	body.appendChild(angular.element(ramjetMorphEl)[0])
  }

  /**
  	bring the ramjetMorph element
  	back as a child to this directive
   **/
  function _linkMorph(){
  	ramjetContainerEl.append(angular.element(ramjetMorphEl)[0])
  }

  /**
  	register the element for the toggler and whether
  	we want to hide on toggle
   **/
  function registerRamjetToggle(element,hideToggle){
    ramjetToggleEl = angular.element(element.children()[0]);
    vm.hideToggle = $scope.$eval(hideToggle || "true");
  }   
  
  /**
  	Register the ramjet container and register whether
  	this will append the morph element to the body
  **/
  function registerRamjetContainer(element,toBody){
    ramjetContainerEl = element;
    vm.toBody = $scope.$eval(toBody || "false");
  }  

  /**
  	Register the morph element
  **/
  function registerMorphElement(element){
    ramjetMorphEl = element;
  }
  
  
}

})();