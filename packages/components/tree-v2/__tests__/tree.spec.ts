import { nextTick } from 'vue'
import { NOOP } from '@vue/shared'
import { makeMountFunc } from '@element-plus/test-utils/make-mount'
import Tree from '../src/tree.vue'
import type {
  TreeData,
  TreeNodeData,
  TreeNode,
  TreeOptionProps,
  TreeKey,
} from '../src/tree.type'

jest.useFakeTimers()

let id = 1

const NODE_NUMBER = 10
const TREE_NODE_CLASS_NAME = '.el-tree-node'
const TREE_NODE_CONTENT_CLASS_NAME = '.el-tree-node__content'
const TREE_NODE_EXPAND_ICON_CLASS_NAME = '.el-tree-node__expand-icon'

const getUniqueId = () => {
  return id++
}

const createData = (
  maxDeep,
  maxChildren,
  minNodesNumber,
  deep = 1,
  disabled = false
) => {
  return new Array(minNodesNumber).fill(deep).map(() => {
    const id = getUniqueId()
    const childrenNumber =
      deep === maxDeep ? 0 : Math.round(Math.random() * maxChildren)
    return {
      id,
      disabled: disabled ? Math.random() > 0.7 : false,
      label: `node-${id}`,
      children: childrenNumber
        ? createData(maxDeep, maxChildren, childrenNumber, deep + 1, disabled)
        : [],
    }
  })
}

const data = createData(4, 30, NODE_NUMBER)

const _mount = makeMountFunc({
  components: {
    'el-tree': Tree,
  },
})

interface TreeProps {
  data?: TreeData
  emptyText?: string
  height?: number
  props?: TreeOptionProps
  highlightCurrent?: boolean
  showCheckbox?: boolean
  defaultCheckedKeys?: TreeKey[]
  checkStrictly?: boolean
  defaultExpandedKeys?: TreeKey[]
  indent?: number
  iconClass?: string
  expandOnClickNode?: boolean
  checkOnClickNode?: boolean
  currentNodeKey?: TreeKey
}

interface TreeEvents {
  onNodeClick?: (nodeData?: TreeNodeData, node?: TreeNode) => void
  onNodeExpand?: (nodeData?: TreeNodeData, node?: TreeNode) => void
}

const createTree = (
  options: {
    data?: () => TreeProps
    methods?: TreeEvents
    slots?: {
      default?: string
    }
  } = {}
) => {
  const defaultSlot =
    (options.slots &&
      options.slots.default &&
      `<template #default="{node}">${options.slots.default}</template>`) ||
    ''
  const wrapper = _mount(
    `
      <el-tree
        ref="tree"
        :data="data"
        :empty-text="emptyText"
        :height="height"
        :props="props"
        :highlight-current="highlightCurrent"
        :show-checkbox="showCheckbox"
        :default-checked-keys="defaultCheckedKeys"
        :check-strictly="checkStrictly"
        :default-expanded-keys="defaultExpandedKeys"
        :indent="indent"
        :icon-class="iconClass"
        :expand-on-click-node="expandOnClickNode"
        :check-on-click-node="checkOnClickNode"
        :current-node-key="currentNodeKey"
        @node-click="onNodeClick"
        @node-expand="onNodeExpand"
      >${defaultSlot}</el-tree>
    `,
    {
      data() {
        return {
          data,
          emptyText: undefined,
          height: undefined,
          props: {
            children: 'children',
            label: 'label',
            disabled: 'disabled',
            value: 'id',
          },
          highlightCurrent: false,
          showCheckbox: false,
          defaultCheckedKeys: undefined,
          checkStrictly: false,
          defaultExpandedKeys: undefined,
          indent: 16,
          iconClass: undefined,
          expandOnClickNode: true,
          checkOnClickNode: false,
          currentNodeKey: undefined,
          ...(options.data && options.data()),
        }
      },
      methods: {
        onNodeClick: NOOP,
        onNodeExpand: NOOP,
        ...options.methods,
      },
    }
  )
  const treeWrapper = wrapper.findComponent(Tree)
  const vm = wrapper.vm as any
  return {
    wrapper,
    treeRef: vm.$refs.tree,
    vm,
    treeWrapper,
    treeVm: treeWrapper.vm as any,
  }
}

describe('Virtual Tree', () => {
  test('create', async () => {
    const { treeVm } = createTree()
    await nextTick()
    expect(treeVm.flattenTree.length).toEqual(NODE_NUMBER)
  })

  test('click node', async () => {
    const onNodeClick = jest.fn()
    const { wrapper, treeVm } = createTree({
      methods: {
        onNodeClick,
      },
    })
    await nextTick()
    const nodes = wrapper.findAll(TREE_NODE_CLASS_NAME)
    await nodes[0].trigger('click')
    expect(onNodeClick).toBeCalled()
    expect(treeVm.flattenTree.length).toBeGreaterThanOrEqual(NODE_NUMBER)
  })

  test('emptyText', async () => {
    const emptyText = '暂无数据'
    const { wrapper } = createTree({
      data() {
        return {
          emptyText,
          data: [],
        }
      },
    })
    await nextTick()
    expect(wrapper.find('.el-tree__empty-text').text()).toBe(emptyText)
  })

  test('height', async () => {
    const { wrapper } = createTree({
      data() {
        return {
          height: 300,
        }
      },
    })
    await nextTick()
    const el = wrapper.find('.el-tree-virtual-list').element as any
    expect(el.style.height).toBe('300px')
  })

  test('props', async () => {
    const { wrapper } = createTree({
      data() {
        return {
          data: [
            {
              key: '1',
              text: 'node-1',
              readonly: false,
              sub: [
                {
                  key: '1-1',
                  text: 'node-1-1',
                  readonly: false,
                },
              ],
            },
            {
              key: '2',
              text: 'node-2',
              readonly: false,
              sub: [
                {
                  key: '2-1',
                  text: 'node-2-1',
                },
                {
                  key: '2-2',
                  text: 'node-2-2',
                  readonly: true,
                },
              ],
            },
          ],
          props: {
            value: 'key',
            label: 'text',
            disabled: 'readonly',
            children: 'sub',
          },
        }
      },
    })
    await nextTick()
    let nodes = wrapper.findAll(TREE_NODE_CLASS_NAME)
    // test props.label
    expect(nodes[0].text()).toBe('node-1')
    expect(nodes[1].text()).toBe('node-2')
    // expand node-2
    await nodes[1].trigger('click')
    nodes = wrapper.findAll(TREE_NODE_CLASS_NAME)
    // test props.children
    expect(nodes[2].text()).toBe('node-2-1')
    expect(nodes[3].text()).toBe('node-2-2')
    // test props.disabled
    expect(nodes[3].classes()).not.toContain('is-focusable')
  })

  test('highlightCurrent', async () => {
    const { wrapper } = createTree({
      data() {
        return {
          highlightCurrent: true,
        }
      },
    })
    await nextTick()
    expect(wrapper.classes()).toContain('el-tree--highlight-current')
  })

  test('showCheckbox', async () => {
    const { wrapper } = createTree({
      data() {
        return {
          height: 400,
          data: [
            {
              id: '1',
              label: 'node-1',
              children: [
                {
                  id: '1-1',
                  label: 'node-1-1',
                  children: [
                    {
                      id: '1-1-1',
                      label: 'node-1-1-1',
                    },
                    {
                      id: '1-1-2',
                      label: 'node-1-1-2',
                    },
                  ],
                },
                {
                  id: '1-2',
                  label: 'node-1-2',
                  children: [
                    {
                      id: '1-2-1',
                      label: 'node-1-2-1',
                    },
                  ],
                },
                {
                  id: '1-3',
                  label: 'node-1-3',
                },
              ],
            },
            {
              id: '2',
              label: 'node-2',
            },
          ],
          showCheckbox: true,
        }
      },
    })
    await nextTick()
    expect(wrapper.find('.el-checkbox').exists()).toBeTruthy()
    // expand all nodes
    let nodes = wrapper.findAll(TREE_NODE_CLASS_NAME)
    await nodes[0].trigger('click')
    nodes = wrapper.findAll(TREE_NODE_CLASS_NAME)
    await nodes[1].trigger('click')
    nodes = wrapper.findAll(TREE_NODE_CLASS_NAME)
    await nodes[4].trigger('click')
    nodes = wrapper.findAll(TREE_NODE_CLASS_NAME)
    expect(nodes.length).toBe(8)
    // When node-1 is checked, all child nodes should be checked
    await nodes[0].find('.el-checkbox').trigger('click')
    expect(wrapper.findAll('.el-checkbox.is-checked').length).toBe(7)
    // When cancel node-1 checked, all child nodes should not be checked
    await nodes[0].find('.el-checkbox').trigger('click')
    expect(wrapper.findAll('.el-checkbox.is-checked').length).toBe(0)
    // When node-1-1 is checked, node-1-1-1 and node-1-1-2 should be checked
    await nodes[1].find('.el-checkbox').trigger('click')
    expect(
      wrapper
        .findAll(`${TREE_NODE_CLASS_NAME}.is-checked`)
        .map((el) => el.text())
        .toString()
    ).toBe(['node-1-1', 'node-1-1-1', 'node-1-1-2'].toString())
    // When cancel node-1-1, node-1-1-1 and node-1-1-2 should not be checked
    await nodes[1].find('.el-checkbox').trigger('click')
    expect(wrapper.findAll('.el-checkbox.is-checked').length).toBe(0)
    // When node-1-1-1 is checked, node-1 and node-1-1 should be indeterminate
    await nodes[2].find('.el-checkbox').trigger('click')
    expect(wrapper.findAll('.el-checkbox.is-checked').length).toBe(1)
    expect(wrapper.findAll('.el-checkbox .is-indeterminate').length).toBe(2)
    // When node-1-1-1 and node-1-1-2 are checked, node-1-1 should be checked, node-1 should be indeterminate
    await nodes[3].find('.el-checkbox').trigger('click')
    expect(wrapper.findAll('.el-checkbox.is-checked').length).toBe(3)
    expect(wrapper.findAll('.el-checkbox .is-indeterminate').length).toBe(1)
  })

  test('defaultCheckedKeys', async () => {
    const { treeRef } = createTree({
      data() {
        return {
          height: 400,
          data: [
            {
              id: '1',
              label: 'node-1',
              children: [
                {
                  id: '1-1',
                  label: 'node-1-1',
                  children: [
                    {
                      id: '1-1-1',
                      label: 'node-1-1-1',
                    },
                    {
                      id: '1-1-2',
                      label: 'node-1-1-2',
                    },
                  ],
                },
                {
                  id: '1-2',
                  label: 'node-1-2',
                  children: [
                    {
                      id: '1-2-1',
                      label: 'node-1-2-1',
                    },
                  ],
                },
                {
                  id: '1-3',
                  label: 'node-1-3',
                },
              ],
            },
            {
              id: '2',
              label: 'node-2',
            },
          ],
          defaultCheckedKeys: ['1-1-1', '1-1-2'],
          showCheckbox: true,
        }
      },
    })
    await nextTick()
    // node-1-1 should be checked
    expect(treeRef.getCheckedKeys().length).toBe(3)
    // node-1-1 should be indeterminate
    expect(treeRef.getHalfCheckedKeys().length).toBe(1)
  })

  test('checkStrictly', async () => {
    const { treeRef, wrapper } = createTree({
      data() {
        return {
          height: 400,
          data: [
            {
              id: '1',
              label: 'node-1',
              children: [
                {
                  id: '1-1',
                  label: 'node-1-1',
                  children: [
                    {
                      id: '1-1-1',
                      label: 'node-1-1-1',
                    },
                    {
                      id: '1-1-2',
                      label: 'node-1-1-2',
                    },
                  ],
                },
                {
                  id: '1-2',
                  label: 'node-1-2',
                  children: [
                    {
                      id: '1-2-1',
                      label: 'node-1-2-1',
                    },
                  ],
                },
                {
                  id: '1-3',
                  label: 'node-1-3',
                },
              ],
            },
            {
              id: '2',
              label: 'node-2',
            },
          ],
          defaultCheckedKeys: ['1-1-1', '1-1-2'],
          showCheckbox: true,
          checkStrictly: true,
        }
      },
    })
    await nextTick()
    // node-1-1 should not be checked
    expect(treeRef.getCheckedKeys().length).toBe(2)
    // node-1-1 should not be indeterminate
    expect(treeRef.getHalfCheckedKeys().length).toBe(0)
    // manual
    const nodes = wrapper.findAll(TREE_NODE_CLASS_NAME)
    await nodes[0].find('.el-checkbox').trigger('click')
    expect(treeRef.getCheckedKeys().length).toBe(3)
  })

  test('defaultExpandedKeys', async () => {
    const { wrapper } = createTree({
      data() {
        return {
          height: 400,
          data: [
            {
              id: '1',
              label: 'node-1',
              children: [
                {
                  id: '1-1',
                  label: 'node-1-1',
                  children: [
                    {
                      id: '1-1-1',
                      label: 'node-1-1-1',
                    },
                    {
                      id: '1-1-2',
                      label: 'node-1-1-2',
                    },
                  ],
                },
                {
                  id: '1-2',
                  label: 'node-1-2',
                  children: [
                    {
                      id: '1-2-1',
                      label: 'node-1-2-1',
                    },
                  ],
                },
                {
                  id: '1-3',
                  label: 'node-1-3',
                },
              ],
            },
            {
              id: '2',
              label: 'node-2',
            },
          ],
          defaultExpandedKeys: ['1'],
        }
      },
    })
    await nextTick()
    const nodes = wrapper.findAll(TREE_NODE_CLASS_NAME)
    expect(nodes.length).toBe(5)
  })

  test('indent', async () => {
    const { wrapper } = createTree({
      data() {
        return {
          indent: 20,
          data: [
            {
              id: '1',
              label: 'node-1',
              children: [
                {
                  id: '1-1',
                  label: 'node-1-1',
                  children: [
                    {
                      id: '1-1-1',
                      label: 'node-1-1-1',
                    },
                    {
                      id: '1-1-2',
                      label: 'node-1-1-2',
                    },
                  ],
                },
                {
                  id: '1-2',
                  label: 'node-1-2',
                  children: [
                    {
                      id: '1-2-1',
                      label: 'node-1-2-1',
                    },
                  ],
                },
                {
                  id: '1-3',
                  label: 'node-1-3',
                },
              ],
            },
            {
              id: '2',
              label: 'node-2',
            },
          ],
          defaultExpandedKeys: ['1'],
        }
      },
    })
    await nextTick()
    const nodes = wrapper.findAll(TREE_NODE_CLASS_NAME)
    const node = nodes[1].element.querySelector(
      TREE_NODE_CONTENT_CLASS_NAME
    ) as any
    expect(node.style.paddingLeft).toBe('20px')
  })

  test('iconClass', async () => {
    const { wrapper } = createTree({
      data() {
        return {
          iconClass: 'custom-icon',
        }
      },
    })
    await nextTick()
    expect(wrapper.find(TREE_NODE_EXPAND_ICON_CLASS_NAME).classes()).toContain(
      'custom-icon'
    )
  })

  test('expandOnClickNode', async () => {
    const onNodeExpand = jest.fn()
    const { wrapper } = createTree({
      data() {
        return {
          expandOnClickNode: false,
        }
      },
      methods: {
        onNodeExpand,
      },
    })
    await nextTick()
    const nodes = wrapper.findAll(TREE_NODE_CLASS_NAME)
    await nodes[0].trigger('click')
    expect(onNodeExpand).not.toHaveBeenCalled()
    await nodes[0].find(TREE_NODE_EXPAND_ICON_CLASS_NAME).trigger('click')
    expect(onNodeExpand).toHaveBeenCalled()
  })

  test('checkOnClickNode', async () => {
    const { wrapper, treeRef } = createTree({
      data() {
        return {
          showCheckbox: true,
          expandOnClickNode: false,
          checkOnClickNode: true,
          checkStrictly: true,
        }
      },
    })
    await nextTick()
    const nodes = wrapper.findAll(TREE_NODE_CLASS_NAME)
    await nodes[0].trigger('click')
    expect(treeRef.getCheckedKeys().toString()).toBe([1].toString())
  })

  test('currentNodeKey', async () => {
    const { wrapper } = createTree({
      data() {
        return {
          currentNodeKey: '2',
          data: [
            {
              id: '1',
              label: 'node-1',
              children: [
                {
                  id: '1-1',
                  label: 'node-1-1',
                  children: [
                    {
                      id: '1-1-1',
                      label: 'node-1-1-1',
                    },
                    {
                      id: '1-1-2',
                      label: 'node-1-1-2',
                    },
                  ],
                },
                {
                  id: '1-2',
                  label: 'node-1-2',
                  children: [
                    {
                      id: '1-2-1',
                      label: 'node-1-2-1',
                    },
                  ],
                },
                {
                  id: '1-3',
                  label: 'node-1-3',
                },
              ],
            },
            {
              id: '2',
              label: 'node-2',
            },
          ],
        }
      },
    })
    await nextTick()
    const nodes = wrapper.findAll(TREE_NODE_CLASS_NAME)
    expect(nodes[1].classes()).toContain('is-current')
  })

  test('custom node content', async () => {
    const { wrapper } = createTree({
      slots: {
        default: `<div class="custom-tree-node-content">cc {{node.label}}</div>`,
      },
    })
    await nextTick()
    expect(wrapper.find('.custom-tree-node-content').text()).toBe('cc node-1')
  })
})
