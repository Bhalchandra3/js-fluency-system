import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';

import { ApiClientError } from '../../core/api/api-error';
import {
  listMistakesFixture,
  mistakeDetailFixture,
} from '../../core/api/fixtures/phase4-contracts';
import { MistakeApiService } from '../../core/api/mistake-api.service';
import { TopicsApiService } from '../../core/api/topics-api.service';
import { MistakesListPage } from './mistakes-list.page';

const topicsFixture = {
  status: 'ok' as const,
  topics: [
    { id: 'topic-fixture-1', name: 'Closures', slug: 'closures' },
    { id: 'topic-fixture-2', name: 'Promises', slug: 'promises' },
  ],
};

describe('MistakesListPage', () => {
  let fixture: ComponentFixture<MistakesListPage>;
  let page: MistakesListPage;
  let mistakesApi: jasmine.SpyObj<MistakeApiService>;
  let topicsApi: jasmine.SpyObj<TopicsApiService>;

  function createPage(
    listImpl: () => ReturnType<MistakeApiService['listMistakes']>,
    topicsImpl: () => ReturnType<TopicsApiService['listTopics']> = () =>
      of(topicsFixture),
  ): void {
    mistakesApi = jasmine.createSpyObj<MistakeApiService>('MistakeApiService', [
      'listMistakes',
      'getMistake',
      'createMistake',
      'updateMistake',
    ]);
    topicsApi = jasmine.createSpyObj<TopicsApiService>('TopicsApiService', [
      'listTopics',
    ]);
    mistakesApi.listMistakes.and.callFake(listImpl);
    topicsApi.listTopics.and.callFake(topicsImpl);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [MistakesListPage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: MistakeApiService, useValue: mistakesApi },
        { provide: TopicsApiService, useValue: topicsApi },
      ],
    });

    fixture = TestBed.createComponent(MistakesListPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('shows loading while listMistakes is in flight', () => {
    mistakesApi = jasmine.createSpyObj<MistakeApiService>('MistakeApiService', [
      'listMistakes',
    ]);
    topicsApi = jasmine.createSpyObj<TopicsApiService>('TopicsApiService', [
      'listTopics',
    ]);
    mistakesApi.listMistakes.and.returnValue(NEVER);
    topicsApi.listTopics.and.returnValue(NEVER);

    TestBed.configureTestingModule({
      imports: [MistakesListPage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: MistakeApiService, useValue: mistakesApi },
        { provide: TopicsApiService, useValue: topicsApi },
      ],
    });
    fixture = TestBed.createComponent(MistakesListPage);
    page = fixture.componentInstance;
    expect(page.viewState()).toBe('loading');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Loading mistakes',
    );
  });

  it('renders list items with topic names and unresolved state', () => {
    createPage(() => of(listMistakesFixture));
    expect(page.viewState()).toBe('ready');
    expect(page.mistakes().length).toBe(1);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Closures');
    expect(text).toContain('Answered incorrectly');
    expect(text).toContain('Unresolved');
    expect(text).toContain('Open');
  });

  it('renders empty state when there are no mistakes', () => {
    createPage(() => of({ status: 'ok' as const, mistakes: [], total: 0 }));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No mistakes yet');
  });

  it('shows error state and retry when the API fails', () => {
    createPage(() =>
      throwError(
        () =>
          new ApiClientError({
            statusCode: 401,
            message: 'Authentication required. Please save a valid access token.',
            fromBackend: false,
          }),
      ),
    );
    expect(page.viewState()).toBe('error');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Could not load mistakes');
    expect(text).toContain('Authentication required');

    mistakesApi.listMistakes.and.returnValue(of(listMistakesFixture));
    topicsApi.listTopics.and.returnValue(of(topicsFixture));
    page.loadMistakes();
    fixture.detectChanges();
    expect(page.viewState()).toBe('ready');
  });

  it('passes unresolvedOnly=true when the filter is checked', () => {
    createPage(() => of(listMistakesFixture));
    mistakesApi.listMistakes.calls.reset();
    page.onUnresolvedFilterChange(true);
    expect(mistakesApi.listMistakes).toHaveBeenCalledWith({ unresolvedOnly: true });
  });

  it('creates a mistake with confirmed fields and refreshes the list', () => {
    createPage(() => of(listMistakesFixture));
    mistakesApi.createMistake.and.returnValue(of(mistakeDetailFixture));
    mistakesApi.listMistakes.calls.reset();

    page.showCreateForm.set(true);
    page.createTopicId.set('topic-fixture-1');
    page.createMistakeText.set('I thought this');
    page.createCorrectUnderstanding.set('Actually that');
    page.submitCreate();
    fixture.detectChanges();

    expect(mistakesApi.createMistake).toHaveBeenCalledWith({
      topicId: 'topic-fixture-1',
      mistakeText: 'I thought this',
      correctUnderstanding: 'Actually that',
    });
    expect(mistakesApi.listMistakes).toHaveBeenCalled();
    expect(page.createSuccess()).toBe('Mistake saved.');
  });

  it('blocks create when required fields are empty', () => {
    createPage(() => of(listMistakesFixture));
    page.showCreateForm.set(true);
    page.submitCreate();
    expect(mistakesApi.createMistake).not.toHaveBeenCalled();
    expect(page.createError()).toBe('Select a topic.');
  });

  it('shows create API errors without claiming success', () => {
    createPage(() => of(listMistakesFixture));
    mistakesApi.createMistake.and.returnValue(
      throwError(
        () =>
          new ApiClientError({
            statusCode: 404,
            message: 'Topic not found',
            fromBackend: true,
          }),
      ),
    );
    page.showCreateForm.set(true);
    page.createTopicId.set('missing');
    page.createMistakeText.set('text');
    page.createCorrectUnderstanding.set('correct');
    page.submitCreate();
    expect(page.createSuccess()).toBeNull();
    expect(page.createError()).toBe('Topic not found');
  });
});
