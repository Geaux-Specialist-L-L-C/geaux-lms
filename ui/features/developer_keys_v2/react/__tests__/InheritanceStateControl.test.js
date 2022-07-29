/*
 * Copyright (C) 2021 - present Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import _ from 'lodash'

import {screen, render, fireEvent} from '@testing-library/react'
import React from 'react'
import {mount} from 'enzyme'
import InheritanceStateControl from '../InheritanceStateControl'
import actions from '../actions/developerKeysActions'
import storeCreator from '../store/store'

const sampleDeveloperKey = (defaults = {}) => {
  return _.merge(_.clone(defaults), {
    id: '1',
    workflow_state: 'on'
  })
}

const getProps = (developerKey, store = false) => {
  if (!store) {
    store = storeCreator({
      listDeveloperKeys: {
        list: [developerKey]
      }
    })
  }
  return {
    developerKey,
    ctx: {
      params: {
        contextId: '1'
      }
    },
    store,
    actions
  }
}

describe('InheritanceStateControl', () => {
  let oldConfirmation = window.confirm

  beforeEach(() => {
    oldConfirmation = window.confirm
  })

  afterEach(() => {
    window.confirm = oldConfirmation
  })

  it('uses the "off" state from the store', () => {
    const key = sampleDeveloperKey({
      developer_key_account_binding: {
        developer_key_id: '1',
        workflow_state: 'off',
        account_owns_binding: true
      }
    })
    const wrapper = mount(<InheritanceStateControl {...getProps(key)} />)
    const checkedBtn = wrapper.find('input[checked=true]').getDOMNode()
    expect(checkedBtn.value).toBe('off')
  })

  it('uses the "on" state from the store', () => {
    const key = sampleDeveloperKey({
      developer_key_account_binding: {
        developer_key_id: '1',
        workflow_state: 'on',
        account_owns_binding: true
      }
    })
    const wrapper = mount(<InheritanceStateControl {...getProps(key)} />)
    const checkedBtn = wrapper.find('input[checked=true]').getDOMNode()
    expect(checkedBtn.value).toBe('on')
  })

  it('renders "off" if "allow" is set as the workflow state for root account', () => {
    const key = sampleDeveloperKey()
    const wrapper = mount(<InheritanceStateControl {...getProps(key)} />)
    const domNode = wrapper.find('input[checked=true]').getDOMNode()
    expect(domNode.value).toBe('off')
  })

  it('updates the state when the RadioInput is clicked', () => {
    window.confirm = jest.fn(() => true)

    const key = sampleDeveloperKey({
      developer_key_account_binding: {
        developer_key_id: '1',
        workflow_state: 'on',
        account_owns_binding: true
      }
    })
    const store = storeCreator({
      listDeveloperKeys: {
        list: [key]
      }
    })

    render(<InheritanceStateControl {...getProps(key, store)} />)
    const item = screen.getByText('Off')
    fireEvent.click(item)
    const updatedDevKey = store.getState().listDeveloperKeys.list[0]

    expect(updatedDevKey.developer_key_account_binding.workflow_state).toBe('off')
  })

  it('does nothing if cancel is clicked in the confirmation modal', () => {
    window.confirm = jest.fn(() => false)

    const key = sampleDeveloperKey({
      developer_key_account_binding: {
        developer_key_id: '1',
        workflow_state: 'on',
        account_owns_binding: true
      }
    })
    const store = storeCreator({
      listDeveloperKeys: {
        list: [key]
      }
    })

    render(<InheritanceStateControl {...getProps(key, store)} />)
    const item = screen.getByText('Off')
    fireEvent.click(item)
    const devKeyFromStore = store.getState().listDeveloperKeys.list[0]

    expect(devKeyFromStore.developer_key_account_binding.workflow_state).toBe('on')
  })

  const rootAccountCTX = {
    params: {
      contextId: '1'
    }
  }

  const siteAdminCTX = {
    params: {
      contextId: 'site_admin'
    }
  }

  function mockDevKey(workflowState, isOwnedByAccount) {
    return {
      id: '10000000000123',
      developer_key_account_binding: {
        workflow_state: workflowState || 'off'
      },
      account_owns_binding: isOwnedByAccount || false
    }
  }

  function componentNode(key, context = rootAccountCTX) {
    const component = mount(
      <InheritanceStateControl
        developerKey={key}
        ctx={context}
        store={{dispatch: () => {}}}
        actions={{setBindingWorkflowState: () => {}}}
      />
    )
    return component.getDOMNode()
  }

  it('disables the radio group if the account does not own the binding and it is set', () => {
    const radioGroup = componentNode(mockDevKey('off')).querySelector('input[type="radio"]')
    expect(radioGroup.disabled).toBe(true)
  })

  it('enables the radio group if the account does not own the binding and it is not set', () => {
    const radioGroup = componentNode(mockDevKey('allow')).querySelector('input[type="radio"]')
    expect(radioGroup.disabled).toBeFalsy()
  })

  it('enables the radio group if the account does the binding', () => {
    const radioGroup = componentNode(mockDevKey('allow', true)).querySelector('input[type="radio"]')
    expect(radioGroup.disabled).toBeFalsy()
  })

  it('the correct state for the developer key', () => {
    const offRadioInput = componentNode(mockDevKey()).querySelector('input[value="off"]')
    expect(offRadioInput.checked).toBe(true)
  })

  it('renders "allow" if no binding is sent only for site_admin', () => {
    const modifiedKey = mockDevKey()
    modifiedKey.developer_key_account_binding = undefined
    const allowRadioInput = componentNode(modifiedKey, siteAdminCTX).querySelector(
      'input[value="allow"]'
    )
    expect(allowRadioInput.checked).toBe(true)
  })

  it('renders an "on" option', () => {
    expect(componentNode({id: '123'}).querySelector('input[value="on"]')).toBeTruthy()
  })

  it('renders an "off" option', () => {
    expect(componentNode({id: '123'}).querySelector('input[value="off"]')).toBeTruthy()
  })

  it('renders an "allow" option only for site_admin', () => {
    expect(
      componentNode(mockDevKey(), siteAdminCTX).querySelector('input[value="allow"]')
    ).toBeTruthy()
  })

  it('do not render an "allow" option only for root-account', () => {
    expect(
      componentNode(mockDevKey(), rootAccountCTX).querySelector('input[value="allow"]')
    ).toBeFalsy()
  })

  it('renders "allow" if "allow" is set as the workflow state for site admin', () => {
    const allowRadioInput = componentNode(mockDevKey('allow'), siteAdminCTX).querySelector(
      'input[value="allow"]'
    )
    expect(allowRadioInput.checked).toBe(true)
  })
})
