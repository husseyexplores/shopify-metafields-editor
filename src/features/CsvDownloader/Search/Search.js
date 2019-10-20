import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import classname from 'classnames'
import { Thumbnail, Stack } from '@shopify/polaris'
import { Checkbox } from 'antd'
import MultiDownshift from '../../../common/components/MultiDownshift'

import queries from './queries'
import useDebounce from '../../../common/hooks/useDebounce'
import { findValue } from '../../../utils'

import './Search.scss'

// ------------------------------------------------------------------

const initialState = {
  edges: null,
  loading: false,
  error: null,
  hasNextPage: false,
  lastCursor: null,
}

function downshiftStateReducer(state, changes) {
  // this prevents the menu from being closed when the user
  // click on 'Load more'
  if (changes.selectedItem === 'LOAD_MORE') {
    return {
      ...changes,
      isOpen: state.isOpen,
      highlightedIndex: state.highlightedIndex,
    }
  }

  return changes
}

function Search({
  value,
  onChange,
  placeholder,
  disabled,
  onClearButtonClick,
  selectedItems,
  onSelectionChange,
  onSelect,
  onUnselect,
}) {
  const deboucedVal = useDebounce(value, 500)
  const [state, setState] = useState(initialState)

  // On query Change
  useEffect(() => {
    if (!deboucedVal) {
      setState(initialState)
      return
    }

    setState(prevState => ({ ...prevState, loading: true, error: null }))

    queries
      .products({ term: deboucedVal, first: 15 })
      .then(res => {
        const { edges, hasNextPage, lastCursor } = res

        setState({
          edges,
          hasNextPage,
          lastCursor,
          loading: false,
          error: null,
        })
      })
      .catch(e => {
        setState({
          edges: null,
          loading: false,
          error: e.message ? e.message : e,
          hasNextPage: false,
          lastCursor: null,
        })
      })
  }, [deboucedVal])

  // On load more
  const onLoadMoreResults = () => {
    if (!state.hasNextPage) return

    setState(prevState => ({ ...prevState, loading: true }))

    queries
      .products({
        term: deboucedVal,
        first: 15,
        after: state.lastCursor,
      })
      .then(res => {
        const { edges, hasNextPage, lastCursor } = res

        setState(prevState => ({
          edges: prevState.edges.concat(edges),
          hasNextPage,
          lastCursor,
          loading: false,
          error: null,
        }))
      })
      .catch(e => {
        setState({
          edges: null,
          loading: false,
          error: e.message ? e.message : e,
          hasNextPage: 0,
          lastCursor: null,
        })
      })
  }

  const handleChange = selected => {
    if (onSelectionChange) {
      onSelectionChange(selected)
    }
  }

  return (
    <div>
      <MultiDownshift
        inputValue={value}
        stateReducer={downshiftStateReducer}
        selectedItems={selectedItems}
        onSelect={item => {
          if (item === 'LOAD_MORE') {
            if (!state.loading) {
              onLoadMoreResults()
              return false
            }
          } else if (item && item.id) {
            onSelect && onSelect(item)
          }
        }}
        onUnselect={onUnselect}
        itemToString={item =>
          item && item.title
            ? item.title || item.first_name || item.id
            : typeof item === 'string'
            ? item
            : ''
        }
        onChange={handleChange}
      >
        {({
          getInputProps,
          getMenuProps,
          getItemProps,
          highlightedIndex,
          isOpen,
          openMenu,
          inputValue,
          selectedItems: downshiftSelectedItems,
        }) => {
          const menuOpen = isOpen && inputValue && !disabled
          // const menuOpen = true

          return (
            <div className="Polaris-MultiDownshiftSearch-Wrapper">
              <div
                className={classname('Polaris-TextField', {
                  'Polaris-TextField--hasValue': Boolean(value),
                  // 'Polaris-TextField--focus': hasFocus,
                })}
              >
                {/* Input */}
                <input
                  {...getInputProps({
                    className: 'Polaris-TextField__Input',
                    disabled,
                    placeholder,
                    onChange: e => {
                      onChange(e.target.value)
                    },
                    onFocus: openMenu,
                  })}
                />
                {/* Clear button */}
                {Boolean(inputValue) && (
                  <button
                    className="Polaris-TextField__ClearButton"
                    onClick={onClearButtonClick}
                  >
                    <span className="Polaris-VisuallyHidden">Clear</span>
                    <span className="Polaris-Icon Polaris-Icon--colorInkLightest Polaris-Icon--isColored">
                      <svg
                        viewBox="0 0 20 20"
                        className="Polaris-Icon__Svg"
                        focusable="false"
                        aria-hidden="true"
                      >
                        <path
                          d="M14.242 12.829l-1.414 1.414L10 11.413l-2.828 2.83-1.414-1.414 2.828-2.83-2.828-2.827 1.414-1.414L10 8.586l2.828-2.828 1.414 1.414L11.414 10l2.828 2.829zM10 1.999A8 8 0 1 0 10 18a8 8 0 0 0 0-16z"
                          fillRule="evenodd"
                        ></path>
                      </svg>
                    </span>
                  </button>
                )}
                <div className="Polaris-TextField__Backdrop"></div>
              </div>

              {/* Dropdown Options */}
              <div className="Polaris-DownshiftSearch-Menu__Wrapper">
                <div
                  className={classname(
                    'Polaris-PositionedOverlay Polaris-DownshiftSearch-Menu__Inner-Wrapper',
                    {
                      'Polaris-Card': menuOpen,
                    }
                  )}
                >
                  {menuOpen && (
                    <p className="Polaris-OptionList__Title">
                      {(() => {
                        const { edges, hasNextPage, loading, error } = state
                        if (error) {
                          return typeof error === 'string'
                            ? error
                            : 'Oops! An error occurred'
                        }

                        if (!loading && edges && edges.length === 0) {
                          return 'No results found'
                        }
                        if (!loading && edges && hasNextPage) {
                          return `Showing first ${edges.length} results`
                        }
                        if (!loading && edges && !hasNextPage) {
                          return `Showing ${edges.length} of ${edges.length} results`
                        }
                        return 'Loading...'
                      })()}
                    </p>
                  )}
                  <div className="Polaris-OptionList">
                    <ul
                      className="Polaris-OptionList__Options"
                      {...getMenuProps()}
                    >
                      {menuOpen && state.edges
                        ? state.edges
                            .map(
                              (
                                {
                                  node: {
                                    id,
                                    handle,
                                    image,
                                    product_type,
                                    title,
                                  },
                                },
                                index
                              ) => {
                                const isSelected = Boolean(
                                  findValue(
                                    downshiftSelectedItems,
                                    value =>
                                      value.id.toString() === id.toString()
                                  )
                                )

                                return (
                                  <li
                                    key={id}
                                    {...getItemProps({
                                      className: classname(
                                        'Polaris-OptionList-Option'
                                      ),
                                      tabIndex: '-1',
                                      index,
                                      item: {
                                        id,
                                        handle,
                                        image,
                                        product_type,
                                        title,
                                      },
                                    })}
                                  >
                                    <button
                                      tabIndex="0"
                                      type="button"
                                      className={classname(
                                        'Polaris-OptionList-Option__SingleSelectOption',
                                        {
                                          'Polaris-OptionList-Option--focused':
                                            highlightedIndex === index,
                                          'font-bold':
                                            highlightedIndex === index,
                                        }
                                      )}
                                    >
                                      <Stack alignment="center">
                                        <Stack.Item>
                                          <Checkbox checked={isSelected} />
                                        </Stack.Item>
                                        <Stack.Item>
                                          <Thumbnail
                                            source={
                                              image && image.src
                                                ? image.src
                                                : 'https://cdn.shopify.com/s/files/1/2388/0287/files/placeholder-img.png?4600'
                                            }
                                            size="small"
                                            alt={title}
                                          />
                                        </Stack.Item>
                                      </Stack>
                                      {title}
                                    </button>
                                  </li>
                                )
                              }
                            )
                            .concat(
                              state.hasNextPage ? (
                                <li
                                  {...getItemProps({
                                    key: 'load-more-results',
                                    className: 'Polaris-OptionList-Option',
                                    tabIndex: '-1',
                                    index: state.edges.length,
                                    item: 'LOAD_MORE',
                                    disabled: state.loading,
                                  })}
                                >
                                  <button
                                    tabIndex="0"
                                    type="button"
                                    className={classname(
                                      'Polaris-OptionList-Option__SingleSelectOption Polaris-Button--plain Polaris-OptionList-Option--disabled',
                                      {
                                        'Polaris-OptionList-Option--focused':
                                          highlightedIndex ===
                                          state.edges.length,
                                        'font-bold':
                                          highlightedIndex ===
                                          state.edges.length,
                                        'Polaris-Button--loading':
                                          state.loading,
                                        'Polaris-Button--disabled':
                                          state.loading,
                                      }
                                    )}
                                  >
                                    <span className="Polaris-Button__Content">
                                      {state.loading && (
                                        <span className="Polaris-Button__Spinner">
                                          <img
                                            src="data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjAgMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTcuMjI5IDEuMTczYTkuMjUgOS4yNSAwIDEgMCAxMS42NTUgMTEuNDEyIDEuMjUgMS4yNSAwIDEgMC0yLjQtLjY5OCA2Ljc1IDYuNzUgMCAxIDEtOC41MDYtOC4zMjkgMS4yNSAxLjI1IDAgMSAwLS43NS0yLjM4NXoiIGZpbGw9IiM5MTlFQUIiLz48L3N2Zz4K"
                                            alt=""
                                            className="Polaris-Spinner Polaris-Spinner--colorInkLightest Polaris-Spinner--sizeSmall"
                                            draggable="false"
                                            role="status"
                                            aria-label="Loading"
                                          />
                                        </span>
                                      )}
                                      <span className="Polaris-Button__Text">
                                        Load more results
                                      </span>
                                    </span>
                                  </button>
                                </li>
                              ) : null
                            )
                        : null}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )
        }}
      </MultiDownshift>
    </div>
  )
}

// ------------------------------------------------------------------

Search.propTypes = {
  onSelect: PropTypes.func,
  onUnselect: PropTypes.func,
  onChange: PropTypes.func,
  onClearButtonClick: PropTypes.func,
  value: PropTypes.string,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  selectedItems: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  onSelectionChange: PropTypes.func,
}

Search.defaultProps = {
  onChange: () => {},
  onClearButtonClick: () => {},
  value: '',
  placeholder: 'Search',
  disabled: false,
}

export default Search