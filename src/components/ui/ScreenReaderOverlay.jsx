import { UI, SITE_NAME } from '../../config/zh-CN';
import { roomName } from '../../config/rooms';
import { useScene } from '../../context/SceneState.js';
import { useGalleryProjects, useStudioContent } from '../../hooks/useLocalContent';
import { ABOUT_PROFILE, ABOUT_INTRO_DETAIL } from '../../config/about-profile';
import { CONTACT_CHANNELS, contactDetail } from '../../config/contact-channels';
import '../../styles/ScreenReaderOverlay.scss';

/**
 * ScreenReaderOverlay — A7 Accessibility
 * 
 * Invisible HTML layer providing screen reader access to 3D canvas content.
 * Contains buttons/links matching interactive 3D elements (doors, rooms).
 * Visually hidden via .sr-only but fully accessible to assistive tech.
 */
const ScreenReaderOverlay = () => {
    const { hasEntered, isInRoom, currentRoom, teleportTo, requestExit, openOverlay } = useScene();
    
    // Pobieranie danych do wygenerowania niewidocznego HTML-a dla SEO / robotów
    const projects = useGalleryProjects();
    const studio = useStudioContent();

    return (
        <div className="sr-overlay" role="complementary" aria-label="三维个人网站辅助导航">
            {/* Skip to content link */}
            <a href="#sr-main-nav" className="sr-only sr-focusable">
                跳转到辅助导航
            </a>

            {/* Main accessible navigation */}
            <nav id="sr-main-nav" className="sr-only" aria-label="网站房间">
                <h1>{SITE_NAME}</h1>
                <h2>空间导航</h2>

                {!hasEntered && (
                    <p>欢迎来到时安的数字空间。点击入口，或聚焦入口后按回车键进入。</p>
                )}

                {hasEntered && !isInRoom && (
                    <>
                        <p>你在走廊中，可以选择一个房间继续探索：</p>
                        <ul>
                            <li>
                                <button onClick={() => teleportTo('about')} type="button">
                                    关于我——了解时安
                                </button>
                            </li>
                            <li>
                                <button onClick={() => teleportTo('gallery')} type="button">
                                    作品展厅——查看我的作品
                                </button>
                            </li>
                            <li>
                                <button onClick={() => teleportTo('contact')} type="button">
                                    联系我——查看联系方式
                                </button>
                            </li>
                            <li>
                                <button onClick={() => teleportTo('studio')} type="button">
                                    工作室——阅读文章与知识资源
                                </button>
                            </li>
                        </ul>
                    </>
                )}

                {hasEntered && isInRoom && (
                    <>
                        <p>
                            {UI.inRoom(roomName(currentRoom))}
                        </p>
                        <button onClick={requestExit} type="button">
                            返回走廊
                        </button>

                        {/* Room-specific content descriptions */}
                        {currentRoom === 'about' && (
                            <div aria-label="关于我内容">
                                <h3>关于时安</h3>
                                <p>{ABOUT_PROFILE.identities.join('、')}</p>
                                {ABOUT_PROFILE.paragraphs.map(p => <p key={p}>{p}</p>)}
                                <button type="button" onClick={() => openOverlay(ABOUT_INTRO_DETAIL)}>阅读个人介绍</button>
                                <h4>社区与共建</h4>
                                <ul>{ABOUT_PROFILE.communityRoles.map(role => <li key={role}>{role}</li>)}</ul>
                                <h4>资质</h4>
                                <ul>{ABOUT_PROFILE.qualifications.map(item => <li key={item.id}>{item.name}</li>)}</ul>
                                <h4>竞赛荣誉</h4>
                                <ul>{ABOUT_PROFILE.honors.map(item => <li key={item.id}>{item.name}</li>)}</ul>
                                <h4>关注方向</h4>
                                <p>{ABOUT_PROFILE.interests.join('、')}</p>
                                <p>滚动或上下滑动可以驾驶纸飞机浏览，点击气球会显示对应的关注方向。</p>
                            </div>
                        )}
                        {currentRoom === 'gallery' && (
                            <div aria-label="作品展厅内容">
                                <h3>我的作品</h3>
                                <p>在晾绳上的纸卡间浏览，点击纸卡翻面查看中文介绍。下方也可以直接阅读项目内容。</p>
                                
                                {projects && projects.length > 0 && (
                                    <ul>
                                        {projects.map((p, i) => (
                                            <li key={i}>
                                                <h4>{p.title}</h4>
                                                <p>{p.status}</p>
                                                <p>{p.description}</p>
                                                {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer">{p.linkLabel}：{p.title}</a>}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                        {currentRoom === 'contact' && (
                            <div aria-label="联系我内容">
                                <h3>联系我</h3>
                                <p>选择海面上的木桶查看联系方式和社交账号，也可以从下方直接打开详情。</p>
                                <ul>{CONTACT_CHANNELS.map(channel => <li key={channel.id}>
                                    <button type="button" onClick={() => openOverlay(contactDetail(channel))}>查看{channel.label}联系方式</button>
                                    <p>{channel.account}</p>
                                    {channel.url && <a href={channel.url} target={channel.id === 'email' ? undefined : '_blank'} rel={channel.id === 'email' ? undefined : 'noopener noreferrer'}>{channel.actionLabel}</a>}
                                </li>)}</ul>
                            </div>
                        )}
                        {currentRoom === 'studio' && (
                            <div aria-label="工作室内容">
                                <h3>工作室</h3>
                                <p>拖动设备塔旋转，滚动或上下滑动浏览。点击屏幕阅读知识库和文章简介，也可从下方直接访问原文。</p>

                                {studio && studio.length > 0 && (
                                    <ul>
                                        {studio.map((s, i) => (
                                            <li key={i}>
                                                <h4>{s.title}</h4>
                                                <p>{s.description}</p>
                                                {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer">{s.actionLabel}：{s.title}</a>}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}

                        {/* Quick navigation to other rooms */}
                        <h3>快速前往</h3>
                        <ul>
                            {currentRoom !== 'about' && (
                                <li><button onClick={() => teleportTo('about')} type="button">前往关于我</button></li>
                            )}
                            {currentRoom !== 'gallery' && (
                                <li><button onClick={() => teleportTo('gallery')} type="button">前往作品展厅</button></li>
                            )}
                            {currentRoom !== 'contact' && (
                                <li><button onClick={() => teleportTo('contact')} type="button">前往联系我</button></li>
                            )}
                            {currentRoom !== 'studio' && (
                                <li><button onClick={() => teleportTo('studio')} type="button">前往工作室</button></li>
                            )}
                        </ul>
                    </>
                )}
            </nav>

            {/* Live region for state changes */}
            <div aria-live="polite" aria-atomic="true" className="sr-only">
                {isInRoom && UI.entered(roomName(currentRoom))}
            </div>
        </div>
    );
};

export default ScreenReaderOverlay;

