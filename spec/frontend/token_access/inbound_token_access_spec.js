import { GlAlert, GlFormInput, GlLoadingIcon, GlFormRadioGroup } from '@gitlab/ui';
import Vue from 'vue';
import VueApollo from 'vue-apollo';
import createMockApollo from 'helpers/mock_apollo_helper';
import { mountExtended, shallowMountExtended } from 'helpers/vue_test_utils_helper';
import waitForPromises from 'helpers/wait_for_promises';
import { createAlert } from '~/alert';
import InboundTokenAccess from '~/token_access/components/inbound_token_access.vue';
import inboundAddGroupOrProjectCIJobTokenScopeMutation from '~/token_access/graphql/mutations/inbound_add_group_or_project_ci_job_token_scope.mutation.graphql';
import inboundRemoveGroupCIJobTokenScopeMutation from '~/token_access/graphql/mutations/inbound_remove_group_ci_job_token_scope.mutation.graphql';
import inboundRemoveProjectCIJobTokenScopeMutation from '~/token_access/graphql/mutations/inbound_remove_project_ci_job_token_scope.mutation.graphql';
import inboundUpdateCIJobTokenScopeMutation from '~/token_access/graphql/mutations/inbound_update_ci_job_token_scope.mutation.graphql';
import inboundGetCIJobTokenScopeQuery from '~/token_access/graphql/queries/inbound_get_ci_job_token_scope.query.graphql';
import inboundGetGroupsAndProjectsWithCIJobTokenScopeQuery from '~/token_access/graphql/queries/inbound_get_groups_and_projects_with_ci_job_token_scope.query.graphql';
import getGroupsAndProjectsQuery from '~/token_access/graphql/queries/get_groups_and_projects.query.graphql';
import {
  inboundJobTokenScopeEnabledResponse,
  inboundJobTokenScopeDisabledResponse,
  inboundGroupsAndProjectsWithScopeResponse,
  inboundGroupsAndProjectsWithScopeResponseWithAddedItem,
  getGroupsAndProjectsResponse,
  inboundAddGroupOrProjectSuccessResponse,
  inboundRemoveGroupSuccess,
  inboundRemoveProjectSuccess,
  inboundUpdateScopeSuccessResponse,
} from './mock_data';

const projectPath = 'root/my-repo';
const testGroupPath = 'gitlab-org';
const testProjectPath = 'root/test';
const message = 'An error occurred';
const error = new Error(message);

Vue.use(VueApollo);

jest.mock('~/alert');

describe('TokenAccess component', () => {
  let wrapper;

  const inboundJobTokenScopeEnabledResponseHandler = jest
    .fn()
    .mockResolvedValue(inboundJobTokenScopeEnabledResponse);
  const inboundJobTokenScopeDisabledResponseHandler = jest
    .fn()
    .mockResolvedValue(inboundJobTokenScopeDisabledResponse);
  const inboundGroupsAndProjectsWithScopeResponseHandler = jest
    .fn()
    .mockResolvedValue(inboundGroupsAndProjectsWithScopeResponse);
  const getGroupsAndProjectsSuccessResponseHandler = jest
    .fn()
    .mockResolvedValue(getGroupsAndProjectsResponse);
  const inboundAddGroupOrProjectSuccessResponseHandler = jest
    .fn()
    .mockResolvedValue(inboundAddGroupOrProjectSuccessResponse);
  const inboundRemoveGroupSuccessHandler = jest.fn().mockResolvedValue(inboundRemoveGroupSuccess);
  const inboundRemoveProjectSuccessHandler = jest
    .fn()
    .mockResolvedValue(inboundRemoveProjectSuccess);
  const inboundUpdateScopeSuccessResponseHandler = jest
    .fn()
    .mockResolvedValue(inboundUpdateScopeSuccessResponse);
  const failureHandler = jest.fn().mockRejectedValue(error);
  const mockToastShow = jest.fn();

  const findRadioGroup = () => wrapper.findComponent(GlFormRadioGroup);
  const findLoadingIcon = () => wrapper.findComponent(GlLoadingIcon);
  const findAddGroupOrProjectBtn = () => wrapper.findByTestId('add-group-or-project-btn');
  const findCancelBtn = () => wrapper.findByRole('button', { name: 'Cancel' });
  const findGroupOrProjectFormGroup = () => wrapper.findByTestId('group-or-project-form-group');
  const findTargetPathInput = () => wrapper.findComponent(GlFormInput);
  const findRemoveProjectBtnAt = (i) =>
    wrapper.findAllByRole('button', { name: 'Remove access' }).at(i);
  const findToggleFormBtn = () => wrapper.findByTestId('crud-form-toggle');
  const findTokenDisabledAlert = () => wrapper.findComponent(GlAlert);
  const findSaveChangesBtn = () => wrapper.findByTestId('save-ci-job-token-scope-changes-btn');

  const createComponent = (requestHandlers, mountFn = shallowMountExtended, provide = {}) => {
    wrapper = mountFn(InboundTokenAccess, {
      provide: {
        fullPath: projectPath,
        enforceAllowlist: false,
        ...provide,
      },
      apolloProvider: createMockApollo(requestHandlers),
      mocks: {
        $toast: {
          show: mockToastShow,
        },
      },
    });

    return waitForPromises();
  };

  describe('loading state', () => {
    it('shows loading state while waiting on query to resolve', async () => {
      createComponent([
        [inboundGetCIJobTokenScopeQuery, inboundJobTokenScopeEnabledResponseHandler],
        [
          inboundGetGroupsAndProjectsWithCIJobTokenScopeQuery,
          inboundGroupsAndProjectsWithScopeResponseHandler,
        ],
      ]);

      expect(findLoadingIcon().exists()).toBe(true);

      await waitForPromises();

      expect(findLoadingIcon().exists()).toBe(false);
    });
  });

  describe('fetching groups and projects and scope', () => {
    it('fetches groups and projects and scope correctly', () => {
      const expectedVariables = {
        fullPath: 'root/my-repo',
      };

      createComponent([
        [inboundGetCIJobTokenScopeQuery, inboundJobTokenScopeEnabledResponseHandler],
        [
          inboundGetGroupsAndProjectsWithCIJobTokenScopeQuery,
          inboundGroupsAndProjectsWithScopeResponseHandler,
        ],
      ]);

      expect(inboundJobTokenScopeEnabledResponseHandler).toHaveBeenCalledWith(expectedVariables);
      expect(inboundGroupsAndProjectsWithScopeResponseHandler).toHaveBeenCalledWith(
        expectedVariables,
      );
    });

    it('handles fetch groups and projects error correctly', async () => {
      await createComponent([
        [inboundGetCIJobTokenScopeQuery, inboundJobTokenScopeEnabledResponseHandler],
        [inboundGetGroupsAndProjectsWithCIJobTokenScopeQuery, failureHandler],
      ]);

      expect(createAlert).toHaveBeenCalledWith({
        message: 'There was a problem fetching the projects',
      });
    });

    it('handles fetch scope error correctly', async () => {
      await createComponent([
        [inboundGetCIJobTokenScopeQuery, failureHandler],
        [
          inboundGetGroupsAndProjectsWithCIJobTokenScopeQuery,
          inboundGroupsAndProjectsWithScopeResponseHandler,
        ],
      ]);

      expect(createAlert).toHaveBeenCalledWith({
        message: 'There was a problem fetching the job token scope value',
      });
    });
  });

  describe('inbound CI job token scope', () => {
    it('is on and the alert is hidden', async () => {
      await createComponent([
        [inboundGetCIJobTokenScopeQuery, inboundJobTokenScopeEnabledResponseHandler],
        [
          inboundGetGroupsAndProjectsWithCIJobTokenScopeQuery,
          inboundGroupsAndProjectsWithScopeResponseHandler,
        ],
      ]);

      expect(findRadioGroup().attributes('checked')).toBe('true');
      expect(findTokenDisabledAlert().exists()).toBe(false);
    });

    it('is off and the alert is visible', async () => {
      await createComponent([
        [inboundGetCIJobTokenScopeQuery, inboundJobTokenScopeDisabledResponseHandler],
        [
          inboundGetGroupsAndProjectsWithCIJobTokenScopeQuery,
          inboundGroupsAndProjectsWithScopeResponseHandler,
        ],
      ]);

      expect(findRadioGroup().attributes('checked')).toBeUndefined();
      expect(findTokenDisabledAlert().exists()).toBe(true);
    });

    describe('radio group', () => {
      it('uses the correct "options" prop', async () => {
        await createComponent([
          [inboundGetCIJobTokenScopeQuery, inboundJobTokenScopeDisabledResponseHandler],
          [
            inboundGetGroupsAndProjectsWithCIJobTokenScopeQuery,
            inboundGroupsAndProjectsWithScopeResponseHandler,
          ],
        ]);

        const expectedOptions = [
          {
            value: false,
            text: 'All groups and projects',
          },
          {
            value: true,
            text: 'Only this project and any groups and projects in the allowlist',
          },
        ];

        expect(findRadioGroup().props('options')).toEqual(expectedOptions);
      });
    });

    describe('on update', () => {
      it('calls inboundUpdateCIJobTokenScopeMutation mutation', async () => {
        await createComponent([
          [inboundGetCIJobTokenScopeQuery, inboundJobTokenScopeEnabledResponseHandler],
          [inboundUpdateCIJobTokenScopeMutation, inboundUpdateScopeSuccessResponseHandler],
        ]);

        const radioGroup = findRadioGroup();

        expect(radioGroup.attributes('checked')).toBe('true');

        await radioGroup.vm.$emit('input', false);

        expect(radioGroup.attributes('checked')).toBeUndefined();

        findSaveChangesBtn().vm.$emit('click');

        await waitForPromises();

        expect(inboundUpdateScopeSuccessResponseHandler).toHaveBeenCalledWith({
          input: {
            fullPath: 'root/my-repo',
            inboundJobTokenScopeEnabled: false,
          },
        });
      });

      it('when mutation is successful, renders toast message', async () => {
        await createComponent([
          [inboundGetCIJobTokenScopeQuery, inboundJobTokenScopeEnabledResponseHandler],
          [inboundUpdateCIJobTokenScopeMutation, inboundUpdateScopeSuccessResponseHandler],
        ]);

        findSaveChangesBtn().vm.$emit('click');

        await waitForPromises();

        expect(mockToastShow).toHaveBeenCalledWith(
          `CI/CD job token permissions for 'Test project' were successfully updated.`,
        );
      });

      it('handles an update error correctly', async () => {
        await createComponent([
          [inboundGetCIJobTokenScopeQuery, inboundJobTokenScopeDisabledResponseHandler],
          [inboundUpdateCIJobTokenScopeMutation, failureHandler],
        ]);

        const radioGroup = findRadioGroup();

        expect(radioGroup.attributes('checked')).toBeUndefined();

        await radioGroup.vm.$emit('input', true);

        expect(radioGroup.attributes('checked')).toBe('true');

        findSaveChangesBtn().vm.$emit('click');

        await waitForPromises();

        expect(radioGroup.attributes('checked')).toBeUndefined();
        expect(createAlert).toHaveBeenCalledWith({ message });
      });
    });

    describe('save changes button', () => {
      it('shows a loading state on click', async () => {
        await createComponent([
          [inboundGetCIJobTokenScopeQuery, inboundJobTokenScopeEnabledResponseHandler],
          [inboundUpdateCIJobTokenScopeMutation, inboundUpdateScopeSuccessResponseHandler],
        ]);

        const button = findSaveChangesBtn();

        expect(button.props('loading')).toBe(false);

        await button.vm.$emit('click');

        expect(button.props('loading')).toBe(true);

        await waitForPromises();

        expect(button.props('loading')).toBe(false);
      });

      it('has a correct title', async () => {
        await createComponent([
          [inboundGetCIJobTokenScopeQuery, inboundJobTokenScopeEnabledResponseHandler],
          [inboundUpdateCIJobTokenScopeMutation, inboundUpdateScopeSuccessResponseHandler],
        ]);

        expect(findSaveChangesBtn().text()).toBe('Save Changes');
      });
    });
  });

  describe.each`
    type         | testPath
    ${'group'}   | ${testGroupPath}
    ${'project'} | ${testProjectPath}
  `('add $type', ({ type, testPath }) => {
    it(`calls add group or project mutation`, async () => {
      await createComponent(
        [
          [inboundGetCIJobTokenScopeQuery, inboundJobTokenScopeEnabledResponseHandler],
          [
            inboundGetGroupsAndProjectsWithCIJobTokenScopeQuery,
            inboundGroupsAndProjectsWithScopeResponseHandler,
          ],
          [getGroupsAndProjectsQuery, getGroupsAndProjectsSuccessResponseHandler],
          [
            inboundAddGroupOrProjectCIJobTokenScopeMutation,
            inboundAddGroupOrProjectSuccessResponseHandler,
          ],
        ],
        mountExtended,
      );

      await findToggleFormBtn().trigger('click');
      await findTargetPathInput().vm.$emit('input', testPath);
      findAddGroupOrProjectBtn().trigger('click');

      expect(inboundAddGroupOrProjectSuccessResponseHandler).toHaveBeenCalledWith({
        projectPath,
        targetPath: testPath,
      });
    });

    it(`increments the ${type} count`, async () => {
      await createComponent(
        [
          [inboundGetCIJobTokenScopeQuery, inboundJobTokenScopeEnabledResponseHandler],
          [
            inboundGetGroupsAndProjectsWithCIJobTokenScopeQuery,
            jest
              .fn()
              .mockResolvedValueOnce(inboundGroupsAndProjectsWithScopeResponse)
              .mockResolvedValueOnce(inboundGroupsAndProjectsWithScopeResponseWithAddedItem),
          ],
          [getGroupsAndProjectsQuery, getGroupsAndProjectsSuccessResponseHandler],
          [
            inboundAddGroupOrProjectCIJobTokenScopeMutation,
            inboundAddGroupOrProjectSuccessResponseHandler,
          ],
        ],
        mountExtended,
      );

      expect(wrapper.findByTestId(`${type}-count`).text()).toBe('1');
      expect(wrapper.findByTestId(`${type}-count`).attributes('title')).toBe(
        `1 ${type} has access`,
      );

      await findToggleFormBtn().trigger('click');
      await findTargetPathInput().vm.$emit('input', testPath);
      findAddGroupOrProjectBtn().trigger('click');

      await waitForPromises();

      expect(wrapper.findByTestId(`${type}-count`).text()).toBe('2');
      expect(wrapper.findByTestId(`${type}-count`).attributes('title')).toBe(
        `2 ${type}s have access`,
      );
    });

    it('add group or project handles error correctly', async () => {
      await createComponent(
        [
          [inboundGetCIJobTokenScopeQuery, inboundJobTokenScopeEnabledResponseHandler],
          [
            inboundGetGroupsAndProjectsWithCIJobTokenScopeQuery,
            inboundGroupsAndProjectsWithScopeResponseHandler,
          ],
          [getGroupsAndProjectsQuery, getGroupsAndProjectsSuccessResponseHandler],
          [inboundAddGroupOrProjectCIJobTokenScopeMutation, failureHandler],
        ],
        mountExtended,
      );

      await findToggleFormBtn().trigger('click');
      await findTargetPathInput().vm.$emit('input', testPath);
      await findAddGroupOrProjectBtn().trigger('click');

      await waitForPromises();

      // show error message
      expect(findTargetPathInput().classes()).toContain('is-invalid');
      expect(findGroupOrProjectFormGroup().text()).toContain(message);

      // remove error message on new input
      await findTargetPathInput().vm.$emit('input', 'new-path');

      expect(findTargetPathInput().classes()).not.toContain('is-invalid');
      expect(findGroupOrProjectFormGroup().text()).not.toContain(message);
    });

    it('clicking cancel hides the form and clears the target path', async () => {
      await createComponent(
        [
          [inboundGetCIJobTokenScopeQuery, inboundJobTokenScopeEnabledResponseHandler],
          [
            inboundGetGroupsAndProjectsWithCIJobTokenScopeQuery,
            inboundGroupsAndProjectsWithScopeResponseHandler,
          ],
          [getGroupsAndProjectsQuery, getGroupsAndProjectsSuccessResponseHandler],
        ],
        mountExtended,
      );

      // open form
      await findToggleFormBtn().trigger('click');

      expect(findTargetPathInput().exists()).toBe(true);

      // add input then cancel form
      await findTargetPathInput().vm.$emit('input', testPath);

      expect(findTargetPathInput().element.value).toEqual(testPath);

      await findCancelBtn().trigger('click');

      expect(findTargetPathInput().exists()).toBe(false);

      // re-open form
      await findToggleFormBtn().trigger('click');

      expect(findTargetPathInput().element.value).toEqual('');
    });
  });

  describe.each`
    type         | index | mutation                                       | handler                               | target
    ${'group'}   | ${0}  | ${inboundRemoveGroupCIJobTokenScopeMutation}   | ${inboundRemoveGroupSuccessHandler}   | ${'targetGroupPath'}
    ${'project'} | ${1}  | ${inboundRemoveProjectCIJobTokenScopeMutation} | ${inboundRemoveProjectSuccessHandler} | ${'targetProjectPath'}
  `('remove $type', ({ type, index, mutation, handler, target }) => {
    it(`calls remove ${type} mutation`, async () => {
      await createComponent(
        [
          [inboundGetCIJobTokenScopeQuery, inboundJobTokenScopeEnabledResponseHandler],
          [
            inboundGetGroupsAndProjectsWithCIJobTokenScopeQuery,
            inboundGroupsAndProjectsWithScopeResponseHandler,
          ],
          [mutation, handler],
        ],
        mountExtended,
      );

      findRemoveProjectBtnAt(index).trigger('click');

      expect(handler).toHaveBeenCalledWith({
        projectPath,
        [target]: expect.any(String),
      });
    });

    it(`decrements the ${type} count`, async () => {
      await createComponent(
        [
          [inboundGetCIJobTokenScopeQuery, inboundJobTokenScopeEnabledResponseHandler],
          [
            inboundGetGroupsAndProjectsWithCIJobTokenScopeQuery,
            jest
              .fn()
              .mockResolvedValueOnce(inboundGroupsAndProjectsWithScopeResponseWithAddedItem)
              .mockResolvedValueOnce(inboundGroupsAndProjectsWithScopeResponse),
          ],
          [mutation, handler],
        ],
        mountExtended,
      );

      expect(wrapper.findByTestId(`${type}-count`).text()).toBe('2');
      expect(wrapper.findByTestId(`${type}-count`).attributes('title')).toBe(
        `2 ${type}s have access`,
      );

      findRemoveProjectBtnAt(index).trigger('click');

      await waitForPromises();

      expect(wrapper.findByTestId(`${type}-count`).text()).toBe('1');
      expect(wrapper.findByTestId(`${type}-count`).attributes('title')).toBe(
        `1 ${type} has access`,
      );
    });

    it(`remove ${type} handles error correctly`, async () => {
      await createComponent(
        [
          [inboundGetCIJobTokenScopeQuery, inboundJobTokenScopeEnabledResponseHandler],
          [
            inboundGetGroupsAndProjectsWithCIJobTokenScopeQuery,
            inboundGroupsAndProjectsWithScopeResponseHandler,
          ],
          [mutation, failureHandler],
        ],
        mountExtended,
      );

      findRemoveProjectBtnAt(index).trigger('click');

      await waitForPromises();

      expect(createAlert).toHaveBeenCalledWith({ message });
    });
  });

  describe('when allowlist is enforced by admin', () => {
    beforeEach(() => {
      const requestHandlers = [
        [inboundGetCIJobTokenScopeQuery, inboundJobTokenScopeDisabledResponseHandler],
        [
          inboundGetGroupsAndProjectsWithCIJobTokenScopeQuery,
          inboundGroupsAndProjectsWithScopeResponseHandler,
        ],
      ];
      const provide = { enforceAllowlist: true };

      return createComponent(requestHandlers, shallowMountExtended, provide);
    });

    it('hides alert, options, and submit button', () => {
      expect(findTokenDisabledAlert().exists()).toBe(false);
      expect(findRadioGroup().exists()).toBe(false);
      expect(findSaveChangesBtn().exists()).toBe(false);
    });
  });
});
