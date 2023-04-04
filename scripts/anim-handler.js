$(document).ready(function() {
  
    var $animationElements = $('.animation-element');
    var $window = $(window);
    var $wrapper = $('.wrapper1');
    // console.log($window[0]);

    // ps: Let's FIRST disable triggering on small devices!
    var isMobile = window.matchMedia("only screen and (max-width: 768px)");
    if (isMobile.matches) {
        $animationElements.removeClass('animation-element');
    }

    function checkIfInView() {

        var windowHeight = $window.height();
        var windowTopPosition = $window.scrollTop();
        var windowBottomPosition = (windowTopPosition + windowHeight);

        $.each($animationElements, function () {
            var $element = $(this);
            var elementHeight = $element.outerHeight();
            var elementTopPosition = $element.offset().top;
            var elementBottomPosition = (elementTopPosition + elementHeight);

//check to see if this current container is within viewport
            if ((elementBottomPosition >= windowTopPosition) &&
                (elementTopPosition <= windowBottomPosition)) {
                $element.removeClass('hidden')
                $element.addClass('animate');
                $element.addClass('slide');
            } else {
                $element.removeClass('animate');
                $element.removeClass('slide');
                $element.addClass('hidden')
            }
        });
    }

    $window.on('scroll', checkIfInView);
    $wrapper.on('scroll', checkIfInView);
    $window.trigger('scroll');
});