import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import { Button, TextField, FieldGroup, RadioButtonField, EntryCard } from '@contentful/forma-36-react-components';
import { init } from 'contentful-ui-extensions-sdk';
import '@contentful/forma-36-react-components/dist/styles.css';
import './index.css';

const LINK_TYPE = 'linkType';
const LINK_TYPE_INTERNAL = 'internal';
const LINK_TYPE_EXTERNAL = 'external';

/**
 * Explanation of the value of this field:
 *
 * type FieldValue = undefined | InternalLink | ExternalLink;
 *
 * type InternalLink = {
 *   type: 'internal',
 *   entry: object,
 * }
 *
 * type ExternalLink = {
 *   type: 'external',
 *   url: string,
 * }
 */

class App extends React.Component {
  /**
   * Prop types for `<App />`.
   * @prop {Object} sdk - Contentful SDK. Added to the component automatically.
   */
  static propTypes = {
    sdk: PropTypes.object.isRequired,
  }

  /**
   * Function to unsubscribe from a Contentful SDK event.
   * @type {?Function}
   */
  detachExternalChangeHandler = null

  /**
   * Internal state for `<App />`.
   * @param {Object} value - Field value. Do not set this directly—use
   * `props.sdk.field.setValue()` instead.
   * @param {?Object} entryCard - Props for entry card component.
   */
  state = {
    value: this.props.sdk.field.getValue(),
    entryCard: null,
  }

  /**
   * When the component mounts, add some event handlers from the Contentful SDK, and do some data
   * fetching if needed.
   */
  componentDidMount() {
    const { sdk } = this.props;
    const { value = {} } = this.state;

    sdk.window.startAutoResizer();

    // Handler for external field value changes (e.g. when multiple authors are working on the same entry).
    this.detachExternalChangeHandler = sdk.field.onValueChanged(value => this.setState({ value }));

    if (
      value.linkType === LINK_TYPE_INTERNAL
      && value.entry !== null
    ) {
      this.getEntryCardProps(value.entry);
    }
  }

  /**
   * When the component re-renders, check if the field value is valid.
   */
  componentDidUpdate() {
    const { sdk } = this.props;
    const { value } = this.state;

    if (!value) {
      return;
    }

    if (value.linkType === LINK_TYPE_INTERNAL) {
      // An internal link is valid if an entry is selected
      sdk.field.setInvalid(value.entry === null);
    } else if (value.linkType === LINK_TYPE_EXTERNAL) {
      // An external link is valid if a URL has been typed
      sdk.field.setInvalid(value.url === '');
    }
  }

  /**
   * Before the component unmounts, clean up event listeners.
   */
  componentWillUnmount() {
    if (this.detachExternalChangeHandler) {
      this.detachExternalChangeHandler();
    }
  }

  /**
   * Get and set the values needed to render an entry card in the editor UI. This is used when the
   * user selects an entry for an internal link.
   * @param {Object} entry - Entry we're rendering a card for.
   */
  async getEntryCardProps(entry) {
    const { sdk } = this.props;

    const contentType = await sdk.space.getContentType(entry.sys.contentType.sys.id);
    const defaultLocale = sdk.locales.default;

    this.setState({
      entryCard: {
        contentType: contentType.name,
        title: entry.fields[contentType.displayField][defaultLocale],
      },
    });
  }

  /**
   * When the user clicks the "Reset" button, unset the current field value.
   */
  handleResetButtonClick = () => {
    this.props.sdk.field.setValue(undefined);
  }

  /**
   * When the link type ("internal" vs. "external") changes, update the field value.
   * @param {String} value - New link type. Should be `'internal'` or `'external'`.
   */
  handleLinkTypeChange(value) {
    const nextState = {
      linkType: value,
    };

    if (value === LINK_TYPE_INTERNAL) {
      nextState.entry = null;
    } else if (value === LINK_TYPE_EXTERNAL) {
      nextState.url = '';
    }

    this.props.sdk.field.setValue(nextState);
  }

  /**
   * When the user selects an entry for an internal link, update the field value, and get props
   * for the entry card to be rendered in the editor.
   */
  handleChooseEntryButtonClick = async () => {
    const { sdk } = this.props;
    const selectedEntry = await sdk.dialogs.selectSingleEntry();

    this.props.sdk.field.setValue({
      ...this.state.value,
      entry: selectedEntry,
    });

    this.getEntryCardProps(selectedEntry);
  }

  /**
   * When the URL field for external links changes, update the field value.
   * @param {String} value - New URL.
   */
  handleExternalUrlChange(value) {
    const { sdk } = this.props;

    sdk.field.setValue({
      ...this.state.value,
      url: value,
    });
  }

  /**
   * Render the correct content for the internal link picker, based on UI state.
   * @returns {Object} React node.
   */
  renderInternalLinkPicker() {
    const { value = {}, entryCard } = this.state;

    // If no entry has been selected, render a button to open the entry selector
    if (!value.entry) {
      return (
        <Button
          onClick={this.handleChooseEntryButtonClick}
        >
          Choose Entry...
        </Button>
      );
    }

    // If the props for the entry card haven't been fetched yet, show a loading state for the card
    if (!entryCard) {
      return (
        <EntryCard
          loading
          size="small"
        />
      );
    }

    // If the props for the entry card have been fetched, show the entry card
    return (
      <EntryCard
        title={entryCard.title}
        contentType={entryCard.contentType}
        size="small"
      />
    );
  }

  /**
   * Render a button to reset the field state.
   * @returns {Object} React node.
   */
  renderResetButton() {
    const { value = {} } = this.state;

    return (
      <FieldGroup>
        <Button
          buttonType="negative"
          icon="Close"
          onClick={this.handleResetButtonClick}
          size="small"
        >
          Remove Link
        </Button>
      </FieldGroup>
    );
  }

  render() {
    const { value = {}, entryCard = {} } = this.state;

    return (
      <Fragment>
        <FieldGroup>
          <RadioButtonField
            labelText="Internal"
            helpText="Link to internal content"
            name={LINK_TYPE}
            checked={value.linkType === LINK_TYPE_INTERNAL}
            value={LINK_TYPE_INTERNAL}
            onChange={e => this.handleLinkTypeChange(e.target.value)}
            id={`link-type-${LINK_TYPE_INTERNAL}`}
          />
          <RadioButtonField
            labelText="External"
            helpText="Link to another website"
            name={LINK_TYPE}
            checked={value.linkType === LINK_TYPE_EXTERNAL}
            value={LINK_TYPE_EXTERNAL}
            onChange={e => this.handleLinkTypeChange(e.target.value)}
            id={`link-type-${LINK_TYPE_EXTERNAL}`}
          />
        </FieldGroup>
        {value.linkType === LINK_TYPE_INTERNAL && (
          <Fragment>
            <FieldGroup>
              {this.renderInternalLinkPicker()}
            </FieldGroup>
            {!value.entry && (
              <FieldGroup>
                <Button
                  buttonType="negative"
                  icon="Close"
                  onClick={this.handleResetButtonClick}
                  size="small"
                >
                  Cancel
                </Button>
              </FieldGroup>
            )}
            {value.entry && (
              <FieldGroup>
                {this.renderResetButton()}
              </FieldGroup>
            )}
          </Fragment>
        )}
        {value.linkType === LINK_TYPE_EXTERNAL && (
          <Fragment>
            <FieldGroup>
              <TextField
                id={`linkType-${LINK_TYPE_EXTERNAL}-url`}
                value={value.url}
                textInputProps={{
                  width: 'large',
                  type: 'url',
                  placeholder: 'Enter a URL',
                  error: value.url === '',
                }}
                onChange={e => this.handleExternalUrlChange(e.target.value)}
              />
            </FieldGroup>
            <FieldGroup>
              {this.renderResetButton()}
            </FieldGroup>
          </Fragment>
        )}
      </Fragment>
    );
  }
}

init(sdk => {
  ReactDOM.render(<App sdk={sdk} />, document.getElementById('root'));
});
