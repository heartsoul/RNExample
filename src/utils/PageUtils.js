/**
 * User: puti.
 * Time: 2018/2/10 下午3:49.
 * GitHub:https://github.com/puti94
 * Email:1059592160@qq.com
 */


import React, {Component} from 'react'
import {RouteHelper} from './RouteHelper'
import {View} from "react-native";
import {ErrorView} from "../components/ErrorView";
import {LoadingView} from "../components/LoadingView";
import {BasePageStore} from "../store/BasePageStore";
import hoistNonReactStatics from 'hoist-non-react-statics'

/**
 * 使用装饰模式给组件添加一些功能，将RouteHelper模块必须的功能加上,
 * 并结合新版react-navigation的API,为每个page页面添加一下生命周期函数
 * 用法 routeHelper(PageComponent) or 使用装饰器@routeHelper
 * @param hasStoreAndView  是否自动添加上shore和加载错误视图
 * @param isStackChild     是否是StackNavigator注册的组件
 * 给一个页面添加正在加载视图，加载错误视图，每个页面都需要一个自己的store包含一个BasePageStore的数据，可以继承BasePageStore
 * @returns {function(*=)}
 */
export const pageHelper = (hasStoreAndView: boolean = true, isStackChild: boolean = true) => {
    return (OldComponent) => {
        const NewCompontent = (...args) => {
            let _instance = new OldComponent(...args);
            if (!(_instance instanceof Component)) {
                console.error('此装饰器对非组件无效');
                return null;
            }
            if (isStackChild && !_instance.props.navigation) {
                console.error('此组件不是StackNavigator的子组件,请设为@pageHelper(true,false)');
                return null;
            }
            if (isStackChild && (!_instance.props.navigation.addListener || typeof _instance.props.navigation.addListener !== 'function')) {
                console.error('请更新最新版本的react-navigation');
                return null;
            }

            if (isStackChild && _instance.props.navigation) {
                let _mComponentDidMount = _instance.componentDidMount ? _instance.componentDidMount.bind(_instance) : null;
                let _mComponentWillUnmount = _instance.componentWillUnmount ? _instance.componentWillUnmount.bind(_instance) : null;
                _instance.componentDidMount = () => {
                    RouteHelper.addStack(_instance.props.navigation);
                    _mComponentDidMount && _mComponentDidMount();
                };

                _instance.componentWillUnmount = () => {
                    RouteHelper.remove(_instance.props.navigation);
                    _mComponentWillUnmount && _mComponentWillUnmount();
                };

                // _instance.params = _instance.props.navigation.state.params;
                _instance.isFocus = false;
                console.log('我是', _instance);

                //注册监听
                _instance.props.navigation.addListener('willBlur', (e) => {
                    if (_instance.componentWillBlur && typeof _instance.componentWillBlur === 'function') {
                        _instance.isFocus = false;
                        _instance.componentWillBlur.call(_instance, e);
                    }
                });
                _instance.props.navigation.addListener('willFocus', (e) => {
                    if (_instance.componentWillFocus && typeof _instance.componentWillFocus === 'function') {
                        _instance.isFocus = false;
                        _instance.componentWillFocus.call(_instance, e)
                    }
                });
                _instance.props.navigation.addListener('didBlur', (e) => {
                    if (_instance.componentDidBlur && typeof _instance.componentDidBlur === 'function') {
                        _instance.isFocus = false;
                        _instance.componentDidBlur.call(_instance, e)
                    }
                });
                _instance.props.navigation.addListener('didFocus', (e) => {
                    if (_instance.componentDidFocus && typeof _instance.componentDidFocus === 'function') {
                        _instance.isFocus = true;
                        _instance.componentDidFocus.call(_instance, e)
                    }
                });
            }

            if (hasStoreAndView) {
                let _mRender = _instance.render.bind(_instance);
                const errorPress = () => {
                    if (_instance.store.errorPress && typeof _instance.store.errorPress === 'function') {
                        _instance.store.errorPress();
                    } else {
                        console.warn('没有预定义错误点击处理方法,将调用store的loadData()方法');
                        _instance.store.loadData();
                    }
                };
                _instance.render = () => {
                    return <View style={{flex: 1}}>
                        {_mRender()}
                        <ErrorView
                            store={_instance.store}
                            errorView={_instance.renderErrorView ? _instance.renderErrorView() : null}
                            onPress={errorPress}/>
                        <LoadingView
                            store={_instance.store}
                            loadingView={_instance.renderLoadingView ? _instance.renderLoadingView() : null}/>
                    </View>
                };
                if (_instance.store) {
                    console.warn('store已经自己定义,请确保含有需要的数据,否则可能一些功能无法使用');
                    return _instance
                }
                if (typeof _instance.getStore !== 'function' || !_instance.getStore()) {
                    _instance.store = new BasePageStore();
                } else {
                    _instance.store = _instance.getStore();
                }
            }
            return _instance
        };
        hoistNonReactStatics(NewCompontent, OldComponent);
        return NewCompontent
    }
};


export const addPageHelper =
    ({
         initialStore = (params) => new BasePageStore(),
         storeName = 'store',
         errorView = null,
         loadingView = null,
         errorPress = null,
     } = {}) => {
        return (OldComponent) => {
            class NewComponent extends Component {

                static displayName = `addPageHelper(${OldComponent.displayName ||
                OldComponent.name})`;

                constructor(props, content) {
                    super(props);
                    this.store = initialStore(this.props.navigation.state.params)
                }

                render() {
                    let newProps = {
                        [storeName]: this.store,
                    };
                    return <View style={{flex: 1}}>
                        <OldComponent
                            {...this.props}
                            {...newProps}
                        />
                        <ErrorView
                            store={this.store}
                            errorView={errorView ? errorView(this.store) : null}
                            onPress={errorPress}/>
                        <LoadingView
                            store={this.store}
                            loadingView={loadingView ? loadingView(this.store) : null}/>

                    </View>
                }
            }

            return hoistNonReactStatics(NewComponent, OldComponent)
        }
    };


export const addToRoute = (OldComponent) => {
    class NewComponent extends Component {
        static displayName = `addToRoute(${OldComponent.displayName ||
        OldComponent.name})`;

        isFocus = false;

        constructor(props, content) {
            super(props);
        }

        componentDidMount() {
            RouteHelper.addStack(this.props.navigation);
            this.subscriptions = [
                this.props.navigation.addListener('didFocus', () => {
                    this.isFocus = true;
                }), this.props.navigation.addListener('willBlur', () => {
                    this.isFocus = false;
                })]
        }

        componentWillUnmount() {
            RouteHelper.remove(this.props.navigation);
            this.subscriptions.forEach(sub => sub.remove());
        }

        render() {
            return <OldComponent
                {...this.props}
                params={this.props.navigation.state.params}
                isFocused={() => this.isFocus}
            />
        }
    }

    return hoistNonReactStatics(NewComponent, OldComponent)
};


