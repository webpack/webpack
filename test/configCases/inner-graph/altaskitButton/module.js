/**
 * Copy from @atlaskit/button
 */

import _extends from 'babel-runtime/helpers/extends';
import _Object$getPrototypeOf from 'babel-runtime/core-js/object/get-prototype-of';
import _classCallCheck from 'babel-runtime/helpers/classCallCheck';
import _createClass from 'babel-runtime/helpers/createClass';
import _possibleConstructorReturn from 'babel-runtime/helpers/possibleConstructorReturn';
import _inherits from 'babel-runtime/helpers/inherits';
import _taggedTemplateLiteral from 'babel-runtime/helpers/taggedTemplateLiteral';

var _templateObject = _taggedTemplateLiteral(['\n  ', ';\n'], ['\n  ', ';\n']),
    _templateObject2 = _taggedTemplateLiteral(['\n  a& {\n    ', ';\n  }\n'], ['\n  a& {\n    ', ';\n  }\n']),
    _templateObject3 = _taggedTemplateLiteral(['&,a&,&:hover,&:active,&:focus{', '}'], ['&,a&,&:hover,&:active,&:focus{', '}']);

import React, { Component } from 'react';
import styled from 'styled-components';
import { withAnalyticsEvents, withAnalyticsContext } from '@atlaskit/analytics-next';

import { name, version } from '../../package.json';
import withDeprecationWarnings from './withDeprecationWarnings';
import getButtonProps from './getButtonProps';
import CustomComponentProxy from './CustomComponentProxy';
import getButtonStyles from '../styled/getButtonStyles';
import ButtonContent from '../styled/ButtonContent';
import ButtonWrapper from '../styled/ButtonWrapper';
import IconWrapper from '../styled/IconWrapper';
import LoadingSpinner from '../styled/LoadingSpinner';

var StyledButton = styled.button(_templateObject, getButtonStyles);
StyledButton.displayName = 'StyledButton';

// Target the <a> here to override a:hover specificity.
var StyledLink = styled.a(_templateObject2, getButtonStyles);
StyledLink.displayName = 'StyledLink';

var StyledSpan = styled.span(_templateObject, getButtonStyles);
StyledSpan.displayName = 'StyledSpan';

var createStyledComponent = function createStyledComponent() {
  // Override pseudo-state specificity.
  // This is necessary because we don't know what DOM element the custom component will render.
  var component = styled(
  //CustomComponentProxy is absolutely valid here, so this seems a
  // problem with styled-components flow definitions
  // $FlowFixMe
  CustomComponentProxy)(_templateObject3, getButtonStyles);
  component.displayName = 'StyledCustomComponent';
  return component;
};

var Button = function (_Component) {
  _inherits(Button, _Component);

  function Button() {
    var _ref;

    var _temp, _this, _ret;

    _classCallCheck(this, Button);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = Button.__proto__ || _Object$getPrototypeOf(Button)).call.apply(_ref, [this].concat(args))), _this), _this.state = {
      isActive: false,
      isFocus: false,
      isHover: false
    }, _this.customComponent = null, _this.onMouseEnter = function () {
      return _this.setState({ isHover: true });
    }, _this.onMouseLeave = function () {
      return _this.setState({ isHover: false, isActive: false });
    }, _this.onMouseDown = function (e) {
      e.preventDefault();
      _this.setState({ isActive: true });
    }, _this.onMouseUp = function () {
      return _this.setState({ isActive: false });
    }, _this.onFocus = function (event) {
      _this.setState({ isFocus: true });
      if (_this.props.onFocus) {
        _this.props.onFocus(event);
      }
    }, _this.onBlur = function (event) {
      _this.setState({ isFocus: false });
      if (_this.props.onBlur) {
        _this.props.onBlur(event);
      }
    }, _this.onInnerClick = function (e) {
      if (_this.props.isDisabled) {
        e.stopPropagation();
      }
      return true;
    }, _this.getInnerRef = function (ref) {
      _this.button = ref;

      if (_this.props.innerRef) _this.props.innerRef(ref);
    }, _temp), _possibleConstructorReturn(_this, _ret);
  }

  _createClass(Button, [{
    key: 'componentWillReceiveProps',
    value: function componentWillReceiveProps(nextProps) {
      if (this.props.component !== nextProps.component) {
        delete this.customComponent;
      }
    }
  }, {
    key: 'componentDidMount',
    value: function componentDidMount() {
      if (this.props.autoFocus && this.button) {
        this.button.focus();
      }
    }

    /* Swallow click events when the button is disabled to prevent inner child clicks bubbling up */

  }, {
    key: 'getStyledComponent',
    value: function getStyledComponent() {
      if (this.props.component) {
        if (!this.customComponent) {
          this.customComponent = createStyledComponent();
        }
        return this.customComponent;
      }

      if (this.props.href) {
        return this.props.isDisabled ? StyledSpan : StyledLink;
      }

      return StyledButton;
    }
  }, {
    key: 'render',
    value: function render() {
      var _props = this.props,
          children = _props.children,
          iconBefore = _props.iconBefore,
          iconAfter = _props.iconAfter,
          isLoading = _props.isLoading,
          shouldFitContainer = _props.shouldFitContainer,
          spacing = _props.spacing,
          appearance = _props.appearance,
          isSelected = _props.isSelected,
          isDisabled = _props.isDisabled;


      var buttonProps = getButtonProps(this);
      var StyledComponent = this.getStyledComponent();

      var iconIsOnlyChild = !!(iconBefore && !iconAfter && !children || iconAfter && !iconBefore && !children);

      return React.createElement(
        StyledComponent,
        _extends({ innerRef: this.getInnerRef }, buttonProps),
        React.createElement(
          ButtonWrapper,
          { onClick: this.onInnerClick, fit: !!shouldFitContainer },
          isLoading ? React.createElement(LoadingSpinner, {
            spacing: spacing,
            appearance: appearance,
            isSelected: isSelected,
            isDisabled: isDisabled
          }) : null,
          iconBefore ? React.createElement(
            IconWrapper,
            {
              isLoading: isLoading,
              spacing: buttonProps.spacing,
              isOnlyChild: iconIsOnlyChild
            },
            iconBefore
          ) : null,
          children ? React.createElement(
            ButtonContent,
            {
              isLoading: isLoading,
              followsIcon: !!iconBefore,
              spacing: buttonProps.spacing
            },
            children
          ) : null,
          iconAfter ? React.createElement(
            IconWrapper,
            {
              isLoading: isLoading,
              spacing: buttonProps.spacing,
              isOnlyChild: iconIsOnlyChild
            },
            iconAfter
          ) : null
        )
      );
    }
  }]);

  return Button;
}(Component);

Button.defaultProps = {
  appearance: 'default',
  isDisabled: false,
  isSelected: false,
  isLoading: false,
  spacing: 'default',
  type: 'button',
  shouldFitContainer: false
};

export var ButtonBase = Button;

export default withAnalyticsContext({
  component: 'button',
  package: name,
  version: version
})(withAnalyticsEvents({
  onClick: function onClick(createAnalyticsEvent) {
    var consumerEvent = createAnalyticsEvent({
      action: 'click'
    });
    consumerEvent.clone().fire('atlaskit');

    return consumerEvent;
  }
})(withDeprecationWarnings(Button)));