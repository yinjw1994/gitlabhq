import { GlExperimentBadge } from '@gitlab/ui';
import Vue from 'vue';
import VueApollo from 'vue-apollo';
import { mountExtended } from 'helpers/vue_test_utils_helper';
import { IndexMlModels } from '~/ml/model_registry/apps';
import ModelRow from '~/ml/model_registry/components/model_row.vue';
import { MODEL_ENTITIES } from '~/ml/model_registry/constants';
import TitleArea from '~/vue_shared/components/registry/title_area.vue';
import MetadataItem from '~/vue_shared/components/registry/metadata_item.vue';
import EmptyState from '~/ml/model_registry/components/empty_state.vue';
import ActionsDropdown from '~/ml/model_registry/components/actions_dropdown.vue';
import SearchableList from '~/ml/model_registry/components/searchable_list.vue';
import createMockApollo from 'helpers/mock_apollo_helper';
import getModelsQuery from '~/ml/model_registry/graphql/queries/get_models.query.graphql';
import * as Sentry from '~/sentry/sentry_browser_wrapper';
import waitForPromises from 'helpers/wait_for_promises';
import { modelsQuery, modelWithOneVersion, modelWithoutVersion } from '../graphql_mock_data';

Vue.use(VueApollo);

const defaultProps = {
  projectPath: 'path/to/project',
  createModelPath: 'path/to/create',
  canWriteModelRegistry: false,
};

describe('ml/model_registry/apps/index_ml_models', () => {
  let wrapper;
  let apolloProvider;

  const createWrapper = ({
    props = {},
    resolver = jest.fn().mockResolvedValue(modelsQuery()),
  } = {}) => {
    const requestHandlers = [[getModelsQuery, resolver]];
    apolloProvider = createMockApollo(requestHandlers);

    const propsData = {
      ...defaultProps,
      ...props,
    };

    wrapper = mountExtended(IndexMlModels, {
      apolloProvider,
      propsData,
    });
  };

  beforeEach(() => {
    jest.spyOn(Sentry, 'captureException').mockImplementation();
  });

  const emptyQueryResolver = () => jest.fn().mockResolvedValue(modelsQuery([]));

  const findAllRows = () => wrapper.findAllComponents(ModelRow);
  const findRow = (index) => findAllRows().at(index);
  const findEmptyState = () => wrapper.findComponent(EmptyState);
  const findTitleArea = () => wrapper.findComponent(TitleArea);
  const findModelCountMetadataItem = () => findTitleArea().findComponent(MetadataItem);
  const findBadge = () => wrapper.findComponent(GlExperimentBadge);
  const findCreateButton = () => wrapper.findByTestId('create-model-button');
  const findActionsDropdown = () => wrapper.findComponent(ActionsDropdown);
  const findSearchableList = () => wrapper.findComponent(SearchableList);

  describe('header', () => {
    beforeEach(() => {
      createWrapper();
    });

    it('displays the title', () => {
      expect(findTitleArea().text()).toContain('Model registry');
    });

    it('displays the experiment badge', () => {
      expect(findBadge().props('helpPageUrl')).toBe(
        '/help/user/project/ml/model_registry/index.md',
      );
    });

    it('renders the extra actions button', () => {
      expect(findActionsDropdown().exists()).toBe(true);
    });
  });

  describe('empty state', () => {
    it('shows empty state', async () => {
      createWrapper({ resolver: emptyQueryResolver() });

      await waitForPromises();

      expect(findEmptyState().props('entityType')).toBe(MODEL_ENTITIES.model);
    });
  });

  describe('create button', () => {
    describe('when user has no permission to write model registry', () => {
      it('does not display create button', async () => {
        createWrapper({ resolver: emptyQueryResolver() });

        await waitForPromises();

        expect(findCreateButton().exists()).toBe(false);
      });
    });

    describe('when user has permission to write model registry', () => {
      it('displays create button', async () => {
        createWrapper({
          props: { canWriteModelRegistry: true },
          resolver: emptyQueryResolver(),
        });

        await waitForPromises();

        expect(findCreateButton().attributes().href).toBe('path/to/create');
      });
    });
  });

  describe('when loading data fails', () => {
    beforeEach(async () => {
      const error = new Error('Failure!');

      createWrapper({ resolver: jest.fn().mockRejectedValue(error) });

      await waitForPromises();
    });

    it('error message is displayed', () => {
      expect(findSearchableList().props('errorMessage')).toBe(
        'Failed to load model with error: Failure!',
      );
    });

    it('error is logged in sentry', () => {
      expect(Sentry.captureException).toHaveBeenCalled();
    });
  });

  describe('with data', () => {
    it('does not show empty state', async () => {
      createWrapper();
      await waitForPromises();

      expect(findEmptyState().exists()).toBe(false);
    });

    describe('header', () => {
      it('sets model metadata item to model count', async () => {
        createWrapper();
        await waitForPromises();

        expect(findModelCountMetadataItem().props('text')).toBe('2 models');
      });
    });

    describe('shows models', () => {
      beforeEach(async () => {
        createWrapper();
        await waitForPromises();
      });

      it('passes items to list', () => {
        expect(findSearchableList().props('items')).toEqual([
          modelWithOneVersion,
          modelWithoutVersion,
        ]);
      });

      it('displays package version rows', () => {
        expect(findAllRows()).toHaveLength(2);
      });

      it('binds the correct props', () => {
        expect(findRow(0).props()).toMatchObject({
          model: expect.objectContaining(modelWithOneVersion),
        });

        expect(findRow(1).props()).toMatchObject({
          model: expect.objectContaining(modelWithoutVersion),
        });
      });
    });

    describe('when query is updated', () => {
      let resolver;

      beforeEach(() => {
        resolver = jest.fn().mockResolvedValue(modelsQuery());
        createWrapper({ resolver });
      });

      it('when orderBy or sort are not present, use default value', async () => {
        findSearchableList().vm.$emit('fetch-page', {
          after: 'eyJpZCI6IjIifQ',
          first: 30,
        });

        await waitForPromises();

        expect(resolver).toHaveBeenLastCalledWith(
          expect.objectContaining({
            fullPath: 'path/to/project',
            first: 30,
            name: undefined,
            orderBy: 'CREATED_AT',
            sort: 'DESC',
            after: 'eyJpZCI6IjIifQ',
          }),
        );
      });

      it('when orderBy or sort present, updates filters', async () => {
        findSearchableList().vm.$emit('fetch-page', {
          after: 'eyJpZCI6IjIifQ',
          first: 30,
          orderBy: 'name',
          sort: 'asc',
          name: 'something',
        });

        await waitForPromises();

        expect(resolver).toHaveBeenLastCalledWith(
          expect.objectContaining({
            fullPath: 'path/to/project',
            first: 30,
            name: 'something',
            orderBy: 'NAME',
            sort: 'ASC',
            after: 'eyJpZCI6IjIifQ',
          }),
        );
      });
    });
  });
});
