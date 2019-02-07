import React from 'react';
import {Redirect} from 'react-router';
import PropTypes from "prop-types";
import {Flow} from "../sdk";
import {PATH} from './app';
import _ from "lodash";

class UserLogin extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      username: '',
      password: '',
      isSubmitting: false,
      redirect: null
    };

    this.handleUsernameUpdate = this.handleUsernameUpdate.bind(this);
    this.handlePasswordUpdate = this.handlePasswordUpdate.bind(this);
    this.handleForgotPassword = this.handleForgotPassword.bind(this);
    this.handleRegister = this.handleRegister.bind(this);
    this.handleResetFlow = this.handleResetFlow.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleUsernameUpdate(event) {
    this.setState({ username: event.target.value });
  }

  handlePasswordUpdate(event) {
    this.setState({ password: event.target.value });
  }

  handleSubmit() {
    const {
      flow,
      userActions,
    } = this.props;

    this.setState({
      isSubmitting: true,
      spinnerMessage: 'Signing you on...',
      errorMessage: ''
    });

    const validatePasswordObject = _.get(flow.getLinks(), 'usernamePassword.check', null);
    const validatePasswordUrl = _.get(validatePasswordObject, 'href', null);

    if (!validatePasswordUrl) {
      return userActions.unrecoverableError(new Error('An unexpected error has occurred'));
    }

    return userActions.signOn(validatePasswordUrl, this.state.username, this.state.password)
    .then((newflow) => {
      this.setState({
        isSubmitting: false
      });

      if (newflow.status === 'COMPLETED') {
        // Redirect to the resume endpoint
        this.props.history.push(newflow.resumeUrl);
      }
      return Promise.resolve(newflow);
    })
    .then((newflow) => {

      userActions.updateFlow(newflow, true);
    })
    .catch((err) => {
      const errorDetail = _.get(err, 'details[0].code', null);
      if (errorDetail === PATH.INVALID_CREDENTIALS) {
        this.setState({
          errorMessage: 'Incorrect username or password. Please try again.',
          isSubmitting: false,
        });
      } else if (errorDetail === PATH.PASSWORD_LOCKED_OUT) {
        const secondsUntilUnlock = _.get(err, 'details[0].innerError.secondsUntilUnlock', null);
        const timeUntilUnlockMsg = (secondsUntilUnlock > 60)
            ? (
                `${Math.floor(secondsUntilUnlock / 60)} minutes`
            )
            : (
                `${secondsUntilUnlock} seconds`
            );
        const errorMessage = `Too many unsuccessful sign-on attempts. Your account will unlock in ${timeUntilUnlockMsg}.`;
        this.setState({
          redirect: (<Redirect
              to={{
                pathname: PATH.UNABLE_TO_SIGN_IN,
                state: { errorMessage },
              }}
          />),
          isSubmitting: false,
        });
      } else {
        this.setState({
          errorMessage: 'An unexpected error has occurred.',
        });
      }

      return Promise.resolve(err);
    });

  }

  handleResetFlow(){
    const {
      flow,
      userActions,
    } = this.props;

    const resetFlowObject = _.get(flow.getLinks(), 'session.reset', null);
    const resetFlowUrl = _.get(resetFlowObject, 'href', null);

    if (!resetFlowUrl) {
      return userActions.unrecoverableError(new Error('An unexpected error has occurred'));
    }

    return userActions.resetFlow(resetFlowUrl);
  }

  handleForgotPassword() {
    //const redirect = <Redirect from={PATH.SING_ON} to={PATH.FORGOT_PASSWORD_USERNAME} />;
    this.setState({
      redirect: (<Redirect from={PATH.SING_ON} to={PATH.FORGOT_PASSWORD_USERNAME} />)
    });
  }

  handleRegister() {
    const redirect = <Redirect from={PATH.SING_ON} to={PATH.REGISTER}/>;
    this.setState({
      redirect
    });
  }

  handlePasswordReset() {
    const redirect = <Redirect from={PATH.SING_ON} to={PATH.CHANGE_PASSWORD}/>;
    this.setState({
      redirect
    });
  }

  render() {
    const { username, password, redirect } = this.state;
    const { flow, message } = this.props;

    const errorAlert = message && message.isError
        ? (
            <div className="input-field">
              <div className="alert alert-danger">{message.content}</div>
            </div>
        )
        : null;

    if(flow) {

      // Rendering a Redirect will cause switch to the corresponding Route's content
      if (flow.isExpired()) {
        return (
            <Redirect
                to={{
                  pathname: '/expired',
                  state: { username, currentPassword: password },
                }}
            />
        );
      }

      const forgotPasswordLink = _.get(flow.getLinks(), 'password.forgot', null);
      const forgotPasswordUrl = _.get(forgotPasswordLink, 'href', null);
      const forgotPasswordAnchor = forgotPasswordUrl && (
          <div className="input-field">
              <a
                  href="#"
                  data-id="recovery-button"
                  onClick={this.handleForgotPassword}
              >
                Forgot Password
              </a>
          </div>
      );

      const userRegistrationLink=_.get(flow.getLinks(), ['user.register'], null);
      const registerUserAnchor = userRegistrationLink && (
            <div className="input-field">
              No account? <a data-id="register-button" href="#" onClick={this.handleRegister}>Register now!</a>
            </div>
      );

      const passwordResetLink=_.get(flow.getLinks(), ['password.reset'], null);
      const passwordResetAnchor = passwordResetLink && (
            <div className="input-field">
              <a data-id="reset-password-button" href="#" onClick={this.handlePasswordReset}>Reset password</a>
            </div>
      );

      return (
          <div>
            {redirect}
            {errorAlert}
            <div className="login-step-app">
              <form>
                <div
                    id="username-form-group"
                    className={(username.length > 0 ? 'input-valid' : 'input-invalid' ) + ' input-field'}
                >
                  <label>
                    Username
                  </label>
                  <input
                      className="username-input"
                      data-id="username-input"
                      type="text"
                      id="username"
                      name="username"
                      value={username}
                      onChange={this.handleUsernameUpdate}
                      placeholder="Username"
                  />
                </div>

                <div
                    id="password-form-group"
                    className={ (password.length > 0 ? 'input-valid' : 'input-invalid' ) + ' input-field'}
                >
                  <label>
                    Password
                  </label>
                  <input
                      className="password-input"
                      data-id="password-input"
                      type="password"
                      id="password" name="password"
                      value={password}
                      onChange={this.handlePasswordUpdate}
                      placeholder="Password"
                  />
                </div>

                <div className="input-group">
                  <button
                      className="btn btn-primary user-credentials-submit"
                      data-id="user-credentials-submit"
                      type="button"
                      onClick={this.handleSubmit}
                      disabled={!username || !password}
                  >
                    Sign in
                  </button>
                </div>
              </form>
              {forgotPasswordAnchor}
              {registerUserAnchor}
              {passwordResetAnchor}
              <div className="input-field">
                <a
                    href="#"
                    onClick={this.handleResetFlow}
                >
                  Switch Accounts
                </a>
              </div>
            </div>
          </div>

      );
    } else {
      return (
          <div className="container">
            {redirect}
            <div>
              Waiting for the flow ...
            </div>
          </div>
      );
    }
  }
}

UserLogin.propTypes = {
  userActions: PropTypes.shape({
    signOn: PropTypes.func.isRequired,
    forgotPassword: PropTypes.func.isRequired,
    resetFlow: PropTypes.func.isRequired,
    unrecoverableError: PropTypes.func.isRequired
  }).isRequired,
  flow: PropTypes.instanceOf(Flow).isRequired
};

export default UserLogin;
